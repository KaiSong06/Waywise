import { randomUUID } from "node:crypto";
import type { DbClient } from "../db/pool.js";
import type { CollectionMode, SourceType } from "../db/schema.js";

export interface ImpactEventInput {
  id?: string;
  anonymousSourceId: string;
  driveSessionId: string;
  sourceType: SourceType;
  collectionMode?: CollectionMode;
  appVersion?: string;
  latitude: number;
  longitude: number;
  gpsAccuracyMeters?: number;
  speedKph: number;
  headingDegrees?: number;
  impactMagnitude: number;
  verticalAcceleration?: number;
  occurredAt: Date;
  uploadedAt?: Date;
  sensorWindowSummary?: unknown;
  accepted?: boolean;
  rejectionReason?: string;
}

export interface ImpactEventRecord {
  id: string;
  anonymousSourceId: string;
  driveSessionId: string;
  sourceType: SourceType;
  latitude: number;
  longitude: number;
  gpsAccuracyMeters?: number;
  speedKph: number;
  headingDegrees?: number;
  impactMagnitude: number;
  verticalAcceleration?: number;
  occurredAt: Date;
  uploadedAt: Date;
  sensorWindowSummary: unknown | null;
  accepted: boolean;
  rejectionReason?: string;
}

export interface DuplicateImpactSearchInput {
  anonymousSourceId: string;
  driveSessionId: string;
  latitude: number;
  longitude: number;
  occurredAt: Date;
  duplicateWindowSeconds: number;
  radiusMeters: number;
}

export async function insertImpactEvent(client: DbClient, input: ImpactEventInput): Promise<ImpactEventRecord> {
  await client.query(
    `
      INSERT INTO anonymous_sources (id, source_type, app_version)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET
        source_type = EXCLUDED.source_type,
        app_version = COALESCE(EXCLUDED.app_version, anonymous_sources.app_version)
    `,
    [input.anonymousSourceId, input.sourceType, input.appVersion ?? null],
  );

  await client.query(
    `
      INSERT INTO drive_sessions (id, anonymous_source_id, collection_mode, event_count)
      VALUES ($1, $2, $3, 1)
      ON CONFLICT (id) DO UPDATE SET
        event_count = drive_sessions.event_count + 1
    `,
    [input.driveSessionId, input.anonymousSourceId, input.collectionMode ?? "demo_send"],
  );

  const result = await client.query<ImpactEventRow>(
    `
      INSERT INTO impact_events (
        id,
        anonymous_source_id,
        drive_session_id,
        location,
        latitude,
        longitude,
        gps_accuracy_meters,
        speed_kph,
        heading_degrees,
        impact_magnitude,
        vertical_acceleration,
        occurred_at,
        uploaded_at,
        source_type,
        sensor_window_summary,
        accepted,
        rejection_reason
      )
      VALUES (
        $1,
        $2,
        $3,
        ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography,
        $5,
        $4,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        COALESCE($12, now()),
        $13,
        $14,
        $15,
        $16
      )
      RETURNING *
    `,
    [
      input.id ?? randomUUID(),
      input.anonymousSourceId,
      input.driveSessionId,
      input.longitude,
      input.latitude,
      input.gpsAccuracyMeters ?? null,
      input.speedKph,
      input.headingDegrees ?? null,
      input.impactMagnitude,
      input.verticalAcceleration ?? null,
      input.occurredAt,
      input.uploadedAt ?? null,
      input.sourceType,
      input.sensorWindowSummary === undefined ? null : JSON.stringify(input.sensorWindowSummary),
      input.accepted ?? true,
      input.rejectionReason ?? null,
    ],
  );

  return mapImpactEventRow(result.rows[0]);
}

export async function findDuplicateImpactEvent(
  client: DbClient,
  input: DuplicateImpactSearchInput,
): Promise<{ id: string } | null> {
  const result = await client.query<{ id: string }>(
    `
      SELECT id
      FROM impact_events
      WHERE anonymous_source_id = $1
        AND drive_session_id = $2
        AND accepted = true
        AND occurred_at BETWEEN $3::timestamptz - make_interval(secs => $4)
          AND $3::timestamptz + make_interval(secs => $4)
        AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography, $7)
      ORDER BY occurred_at DESC
      LIMIT 1
    `,
    [
      input.anonymousSourceId,
      input.driveSessionId,
      input.occurredAt,
      input.duplicateWindowSeconds,
      input.longitude,
      input.latitude,
      input.radiusMeters,
    ],
  );

  return result.rows[0] ?? null;
}

export async function findImpactEventById(client: DbClient, id: string): Promise<ImpactEventRecord | null> {
  const result = await client.query<ImpactEventRow>("SELECT * FROM impact_events WHERE id = $1", [id]);

  if (result.rowCount === 0) {
    return null;
  }

  return mapImpactEventRow(result.rows[0]);
}

export async function listUnassignedAcceptedImpactEvents(client: DbClient): Promise<ImpactEventRecord[]> {
  const result = await client.query<ImpactEventRow>(
    `
      SELECT impact_events.*
      FROM impact_events
      LEFT JOIN candidate_events ON candidate_events.impact_event_id = impact_events.id
      WHERE impact_events.accepted = true
        AND candidate_events.impact_event_id IS NULL
      ORDER BY impact_events.occurred_at ASC
    `,
  );

  return result.rows.map(mapImpactEventRow);
}

interface ImpactEventRow {
  id: string;
  anonymous_source_id: string;
  drive_session_id: string;
  latitude: number;
  longitude: number;
  gps_accuracy_meters: number | null;
  speed_kph: number;
  heading_degrees: number | null;
  impact_magnitude: number;
  vertical_acceleration: number | null;
  occurred_at: Date;
  uploaded_at: Date;
  source_type: SourceType;
  sensor_window_summary: unknown | null;
  accepted: boolean;
  rejection_reason: string | null;
}

function mapImpactEventRow(row: ImpactEventRow): ImpactEventRecord {
  return {
    id: row.id,
    anonymousSourceId: row.anonymous_source_id,
    driveSessionId: row.drive_session_id,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    gpsAccuracyMeters: row.gps_accuracy_meters === null ? undefined : Number(row.gps_accuracy_meters),
    speedKph: Number(row.speed_kph),
    headingDegrees: row.heading_degrees === null ? undefined : Number(row.heading_degrees),
    impactMagnitude: Number(row.impact_magnitude),
    verticalAcceleration: row.vertical_acceleration === null ? undefined : Number(row.vertical_acceleration),
    occurredAt: row.occurred_at,
    uploadedAt: row.uploaded_at,
    sourceType: row.source_type,
    sensorWindowSummary: row.sensor_window_summary,
    accepted: row.accepted,
    rejectionReason: row.rejection_reason === null ? undefined : row.rejection_reason,
  };
}
