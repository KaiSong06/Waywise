import { randomUUID } from "node:crypto";
import type { DbClient } from "../db/pool.js";
import type { CandidateStatus, SeverityLevel } from "../db/schema.js";

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

export async function listCandidates(client: DbClient): Promise<CandidateRecord[]> {
  const result = await client.query<CandidateRow>(
    "SELECT * FROM pothole_candidates ORDER BY last_detected_at DESC NULLS LAST, created_at DESC",
  );

  return result.rows.map(mapCandidateRow);
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
