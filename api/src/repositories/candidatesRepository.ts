import { randomUUID } from "node:crypto";
import { lockTransactionAdvisoryKey } from "../db/advisoryLocks.js";
import type { DbClient } from "../db/pool.js";
import type { CandidateStatus, SeverityLevel } from "../db/schema.js";
import type { CandidateEvidenceEvent, CandidateScore } from "../domain/candidate.js";

const candidateClusterLockNamespace = 20_260_510;

export interface CandidateRecord {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  confidenceScore: number;
  severity: SeverityLevel;
  heatRadiusMeters: number;
  heatIntensity: number;
  uniqueSourceCount: number;
  eventCount: number;
  averageImpactMagnitude: number;
  peakImpactMagnitude: number;
  firstDetectedAt: Date | null;
  lastDetectedAt: Date | null;
  status: CandidateStatus;
  lastScoredAt: Date | null;
}

export interface CandidateInput {
  id?: string;
  latitude: number;
  longitude: number;
  address?: string;
  confidenceScore?: number;
  severity?: SeverityLevel;
  heatRadiusMeters?: number;
  heatIntensity?: number;
  uniqueSourceCount?: number;
  eventCount?: number;
  averageImpactMagnitude?: number;
  peakImpactMagnitude?: number;
  firstDetectedAt?: Date;
  lastDetectedAt?: Date;
  status?: CandidateStatus;
  lastScoredAt?: Date;
}

export async function insertCandidate(client: DbClient, input: CandidateInput): Promise<CandidateRecord> {
  const result = await client.query<CandidateRow>(
    `
      INSERT INTO pothole_candidates (
        id,
        location,
        latitude,
        longitude,
        approximate_address,
        confidence_score,
        severity_level,
        heat_radius_meters,
        heat_intensity,
        unique_source_count,
        event_count,
        average_impact_magnitude,
        peak_impact_magnitude,
        first_detected_at,
        last_detected_at,
        status,
        last_scored_at
      )
      VALUES (
        $1,
        ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
        $3,
        $2,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        $14,
        $15,
        $16
      )
      RETURNING *
    `,
    [
      input.id ?? randomUUID(),
      input.longitude,
      input.latitude,
      input.address ?? "Unknown road segment",
      input.confidenceScore ?? 0,
      input.severity ?? "low",
      input.heatRadiusMeters ?? 12,
      input.heatIntensity ?? 0.2,
      input.uniqueSourceCount ?? 0,
      input.eventCount ?? 0,
      input.averageImpactMagnitude ?? 0,
      input.peakImpactMagnitude ?? 0,
      input.firstDetectedAt ?? null,
      input.lastDetectedAt ?? null,
      input.status ?? "monitoring",
      input.lastScoredAt ?? null,
    ],
  );

  return mapCandidateRow(result.rows[0]);
}

export async function findCandidateWithinRadius(
  client: DbClient,
  input: { latitude: number; longitude: number; radiusMeters: number },
): Promise<(CandidateRecord & { distanceMeters: number }) | null> {
  const result = await client.query<CandidateRow & { distance_meters: number }>(
    `
      SELECT *,
        ST_Distance(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS distance_meters
      FROM pothole_candidates
      WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
      ORDER BY distance_meters ASC
      LIMIT 1
    `,
    [input.longitude, input.latitude, input.radiusMeters],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return {
    ...mapCandidateRow(result.rows[0]),
    distanceMeters: Number(result.rows[0].distance_meters),
  };
}

export async function lockCandidateSearchArea(
  client: DbClient,
  input: { latitude: number; longitude: number; radiusMeters: number },
): Promise<void> {
  const lockKeys = candidateSearchAreaLockKeys(input);

  for (const key of lockKeys) {
    await lockTransactionAdvisoryKey(client, candidateClusterLockNamespace, key);
  }
}

export async function listCandidates(client: DbClient): Promise<CandidateRecord[]> {
  const result = await client.query<CandidateRow>(
    "SELECT * FROM pothole_candidates ORDER BY last_detected_at DESC NULLS LAST, created_at DESC",
  );

  return result.rows.map(mapCandidateRow);
}

export async function getCandidateById(client: DbClient, id: string): Promise<CandidateRecord | null> {
  const result = await client.query<CandidateRow>("SELECT * FROM pothole_candidates WHERE id = $1", [id]);

  if (result.rowCount === 0) {
    return null;
  }

  return mapCandidateRow(result.rows[0]);
}

export async function updateCandidateStatus(
  client: DbClient,
  id: string,
  status: CandidateStatus,
): Promise<{ id: string; previousStatus: CandidateStatus; status: CandidateStatus } | null> {
  const result = await client.query<{
    id: string;
    previous_status: CandidateStatus;
    status: CandidateStatus;
  }>(
    `
      WITH existing AS (
        SELECT id, status AS previous_status
        FROM pothole_candidates
        WHERE id = $1
      ),
      updated AS (
        UPDATE pothole_candidates
        SET status = $2,
          updated_at = now()
        WHERE id = $1
        RETURNING id, status
      )
      SELECT updated.id, existing.previous_status, updated.status
      FROM updated
      JOIN existing ON existing.id = updated.id
    `,
    [id, status],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    previousStatus: row.previous_status,
    status: row.status,
  };
}

export async function linkCandidateEvent(
  client: DbClient,
  input: { candidateId: string; eventId: string },
): Promise<void> {
  await client.query(
    `
      INSERT INTO candidate_events (
        pothole_candidate_id,
        impact_event_id,
        distance_meters_from_candidate
      )
      SELECT $1, $2, ST_Distance(pothole_candidates.location, impact_events.location)
      FROM pothole_candidates, impact_events
      WHERE pothole_candidates.id = $1
        AND impact_events.id = $2
      ON CONFLICT (pothole_candidate_id, impact_event_id) DO NOTHING
    `,
    [input.candidateId, input.eventId],
  );
}

export async function getCandidateEvidence(
  client: DbClient,
  candidateId: string,
): Promise<CandidateEvidenceEvent[]> {
  const result = await client.query<{
    id: string;
    anonymous_source_id: string;
    impact_magnitude: number;
    latitude: number;
    longitude: number;
    occurred_at: Date;
    gps_accuracy_meters: number | null;
  }>(
    `
      SELECT
        impact_events.id,
        impact_events.anonymous_source_id,
        impact_events.impact_magnitude,
        impact_events.latitude,
        impact_events.longitude,
        impact_events.occurred_at,
        impact_events.gps_accuracy_meters
      FROM candidate_events
      JOIN impact_events ON impact_events.id = candidate_events.impact_event_id
      WHERE candidate_events.pothole_candidate_id = $1
        AND impact_events.accepted = true
      ORDER BY impact_events.occurred_at ASC
    `,
    [candidateId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    anonymousSourceId: row.anonymous_source_id,
    impactMagnitude: Number(row.impact_magnitude),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    occurredAt: row.occurred_at,
    gpsAccuracyMeters: row.gps_accuracy_meters === null ? undefined : Number(row.gps_accuracy_meters),
  }));
}

export async function updateCandidateScore(
  client: DbClient,
  candidateId: string,
  score: CandidateScore,
): Promise<CandidateRecord> {
  const result = await client.query<CandidateRow>(
    `
      UPDATE pothole_candidates
      SET confidence_score = $2,
        severity_level = $3,
        heat_radius_meters = $4,
        heat_intensity = $5,
        unique_source_count = $6,
        event_count = $7,
        average_impact_magnitude = $8,
        peak_impact_magnitude = $9,
        first_detected_at = $10,
        last_detected_at = $11,
        last_scored_at = now(),
        updated_at = now()
      WHERE id = $1
      RETURNING *
    `,
    [
      candidateId,
      score.confidenceScore,
      score.severity,
      score.heatRadiusMeters,
      score.heatIntensity,
      score.uniqueSourceCount,
      score.eventCount,
      score.averageImpactMagnitude,
      score.peakImpactMagnitude,
      score.firstDetectedAt,
      score.lastDetectedAt,
    ],
  );

  return mapCandidateRow(result.rows[0]);
}

interface CandidateRow {
  id: string;
  latitude: number;
  longitude: number;
  approximate_address: string;
  confidence_score: number;
  severity_level: SeverityLevel;
  heat_radius_meters: number;
  heat_intensity: number;
  unique_source_count: number;
  event_count: number;
  average_impact_magnitude: number;
  peak_impact_magnitude: number;
  first_detected_at: Date | null;
  last_detected_at: Date | null;
  status: CandidateStatus;
  last_scored_at: Date | null;
}

function mapCandidateRow(row: CandidateRow): CandidateRecord {
  return {
    id: row.id,
    address: row.approximate_address,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    confidenceScore: Number(row.confidence_score),
    severity: row.severity_level,
    heatRadiusMeters: Number(row.heat_radius_meters),
    heatIntensity: Number(row.heat_intensity),
    uniqueSourceCount: Number(row.unique_source_count),
    eventCount: Number(row.event_count),
    averageImpactMagnitude: Number(row.average_impact_magnitude),
    peakImpactMagnitude: Number(row.peak_impact_magnitude),
    firstDetectedAt: row.first_detected_at,
    lastDetectedAt: row.last_detected_at,
    status: row.status,
    lastScoredAt: row.last_scored_at,
  };
}

function candidateSearchAreaLockKeys(input: { latitude: number; longitude: number; radiusMeters: number }) {
  const cellSizeMeters = Math.max(input.radiusMeters, 1);
  const latitudeMeters = input.latitude * 111_320;
  const longitudeMeters = input.longitude * Math.cos((input.latitude * Math.PI) / 180) * 111_320;
  const originX = Math.floor(longitudeMeters / cellSizeMeters);
  const originY = Math.floor(latitudeMeters / cellSizeMeters);
  const keys = new Set<number>();

  for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
    for (let yOffset = -1; yOffset <= 1; yOffset += 1) {
      keys.add(hashCandidateCell(originX + xOffset, originY + yOffset));
    }
  }

  return [...keys].sort((left, right) => left - right);
}

function hashCandidateCell(x: number, y: number) {
  let hash = 0x811c9dc5;
  hash = mixHash(hash, x);
  hash = mixHash(hash, y);
  return hash | 0;
}

function mixHash(hash: number, value: number) {
  let mixed = hash ^ value;
  mixed = Math.imul(mixed, 0x01000193);
  mixed ^= value >> 16;
  return mixed | 0;
}
