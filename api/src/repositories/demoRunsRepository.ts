import type { DbClient } from "../db/pool.js";

export interface DemoRunRecord {
  id: string;
  seed: string;
  status: "running" | "completed" | "failed";
  startedAt: Date;
  endedAt: Date | null;
  targetLocationsCount: number;
  syntheticSourceCount: number;
  eventCount: number;
  errorMessage: string | null;
}

export async function createDemoRun(
  client: DbClient,
  input: { seed: string; targetLocationsCount?: number; syntheticSourceCount?: number; eventCount?: number },
): Promise<DemoRunRecord> {
  const result = await client.query<DemoRunRow>(
    `
      INSERT INTO demo_runs (seed, target_locations_count, synthetic_source_count, event_count)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [
      input.seed,
      input.targetLocationsCount ?? 0,
      input.syntheticSourceCount ?? 0,
      input.eventCount ?? 0,
    ],
  );

  return mapDemoRunRow(result.rows[0]);
}

export async function findCompletedDemoRunBySeed(
  client: DbClient,
  seed: string,
): Promise<DemoRunRecord | null> {
  const result = await client.query<DemoRunRow>(
    `
      SELECT *
      FROM demo_runs
      WHERE seed = $1
        AND status = 'completed'
      ORDER BY ended_at DESC NULLS LAST, started_at DESC
      LIMIT 1
    `,
    [seed],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapDemoRunRow(result.rows[0]);
}

export async function finishDemoRun(
  client: DbClient,
  input: { id: string; status: "completed" | "failed"; errorMessage?: string },
): Promise<DemoRunRecord> {
  const result = await client.query<DemoRunRow>(
    `
      UPDATE demo_runs
      SET status = $2,
        error_message = $3,
        ended_at = now()
      WHERE id = $1
      RETURNING *
    `,
    [input.id, input.status, input.errorMessage ?? null],
  );

  return mapDemoRunRow(result.rows[0]);
}

interface DemoRunRow {
  id: string;
  seed: string;
  status: "running" | "completed" | "failed";
  started_at: Date;
  ended_at: Date | null;
  target_locations_count: number;
  synthetic_source_count: number;
  event_count: number;
  error_message: string | null;
}

function mapDemoRunRow(row: DemoRunRow): DemoRunRecord {
  return {
    id: row.id,
    seed: row.seed,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    targetLocationsCount: Number(row.target_locations_count),
    syntheticSourceCount: Number(row.synthetic_source_count),
    eventCount: Number(row.event_count),
    errorMessage: row.error_message,
  };
}
