import { createTestDatabasePool, describeWithDatabase } from "../test/databaseTestHarness.js";

describeWithDatabase("database schema", () => {
  it("runs migrations and enables PostGIS-backed tables", async () => {
    const pool = await createTestDatabasePool();

    try {
      const extensions = await pool.query<{ extname: string }>(
        "SELECT extname FROM pg_extension WHERE extname IN ('postgis', 'pgcrypto')",
      );
      const tables = await pool.query<{ table_name: string }>(
        `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name IN (
            'anonymous_sources',
            'drive_sessions',
            'impact_events',
            'pothole_candidates',
            'candidate_events',
            'status_history',
            'known_road_features',
            'demo_runs'
          )
        `,
      );

      expect(extensions.rows.map((row) => row.extname).sort()).toEqual(["pgcrypto", "postgis"]);
      expect(tables.rowCount).toBe(8);
    } finally {
      await pool.end();
    }
  });
});
