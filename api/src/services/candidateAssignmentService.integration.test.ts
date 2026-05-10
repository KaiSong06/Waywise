import { createCandidateAssignmentService } from "./candidateAssignmentService.js";
import { insertImpactEvent } from "../repositories/impactEventsRepository.js";
import { listCandidates } from "../repositories/candidatesRepository.js";
import { createTestDatabasePool, describeWithDatabase } from "../test/databaseTestHarness.js";

describeWithDatabase("candidate assignment service", () => {
  it("assigns concurrent nearby events to a single candidate", async () => {
    const pool = await createTestDatabasePool();

    try {
      await installDelayedCandidateInsertTrigger(pool);

      const service = createCandidateAssignmentService({
        pool,
        config: { clusteringRadiusMeters: 20 },
      });
      const events = await Promise.all(
        Array.from({ length: 8 }, (_, index) =>
          insertImpactEvent(pool, {
            anonymousSourceId: `ios-demo-${index}`,
            driveSessionId: `session-${index}`,
            sourceType: "ios_demo",
            latitude: 43.6487 + index * 0.000002,
            longitude: -79.396 + index * 0.000002,
            speedKph: 38,
            headingDegrees: 270,
            impactMagnitude: 8.2,
            occurredAt: new Date(`2026-05-10T14:32:${String(index).padStart(2, "0")}Z`),
          }),
        ),
      );

      await Promise.all(events.map((event) => service.assignEvent(event.id)));

      const candidates = await listCandidates(pool);
      expect(candidates).toHaveLength(1);
      expect(candidates[0]).toMatchObject({
        eventCount: events.length,
        uniqueSourceCount: events.length,
      });
    } finally {
      await dropDelayedCandidateInsertTrigger(pool);
      await pool.end();
    }
  });
});

async function installDelayedCandidateInsertTrigger(pool: { query: (sql: string) => Promise<unknown> }) {
  await pool.query(`
    CREATE OR REPLACE FUNCTION test_delay_pothole_candidate_insert()
    RETURNS trigger AS $$
    BEGIN
      PERFORM pg_sleep(0.05);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS test_delay_pothole_candidate_insert ON pothole_candidates;

    CREATE TRIGGER test_delay_pothole_candidate_insert
    BEFORE INSERT ON pothole_candidates
    FOR EACH ROW
    EXECUTE FUNCTION test_delay_pothole_candidate_insert();
  `);
}

async function dropDelayedCandidateInsertTrigger(pool: { query: (sql: string) => Promise<unknown> }) {
  await pool.query(`
    DROP TRIGGER IF EXISTS test_delay_pothole_candidate_insert ON pothole_candidates;
    DROP FUNCTION IF EXISTS test_delay_pothole_candidate_insert();
  `);
}
