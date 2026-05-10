import type { DbPool } from "../db/pool.js";
import { createPool } from "../db/pool.js";
import { runMigrations } from "../db/migrate.js";
import { loadEnv } from "../config/env.js";

export const testDatabaseUrl = process.env.TEST_DATABASE_URL;
export const hasTestDatabase = Boolean(testDatabaseUrl);

export function describeWithDatabase(name: string, fn: () => void) {
  const runner = hasTestDatabase ? describe : describe.skip;
  runner(name, fn);
}

export async function createTestDatabasePool(): Promise<DbPool> {
  if (!testDatabaseUrl) {
    throw new Error("TEST_DATABASE_URL is required for database integration tests");
  }

  const pool = createPool(
    loadEnv({
      NODE_ENV: "test",
      DATABASE_URL: testDatabaseUrl,
    }),
  );

  await runMigrations(pool);
  await resetTestDatabase(pool);
  return pool;
}

export async function resetTestDatabase(pool: DbPool) {
  await pool.query(`
    TRUNCATE TABLE
      status_history,
      candidate_events,
      pothole_candidates,
      known_road_features,
      impact_events,
      drive_sessions,
      anonymous_sources,
      demo_runs
    RESTART IDENTITY CASCADE
  `);
}
