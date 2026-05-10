import { createTestDatabasePool, describeWithDatabase } from "../test/databaseTestHarness.js";
import { findCandidateWithinRadius, insertCandidate, listCandidates } from "./candidatesRepository.js";

describeWithDatabase("candidates repository", () => {
  it("finds the nearest candidate inside a geospatial radius", async () => {
    const pool = await createTestDatabasePool();

    try {
      const near = await insertCandidate(pool, {
        address: "Queen St W & Spadina Ave",
        latitude: 43.6487,
        longitude: -79.396,
        confidenceScore: 80,
        severity: "high",
      });

      await insertCandidate(pool, {
        address: "Dundas St W & Bathurst St",
        latitude: 43.6521,
        longitude: -79.4059,
      });

      const match = await findCandidateWithinRadius(pool, {
        latitude: 43.64872,
        longitude: -79.39603,
        radiusMeters: 20,
      });
      const miss = await findCandidateWithinRadius(pool, {
        latitude: 43.64872,
        longitude: -79.39603,
        radiusMeters: 1,
      });

      expect(match?.id).toBe(near.id);
      expect(match?.distanceMeters).toBeLessThan(20);
      expect(miss).toBeNull();
    } finally {
      await pool.end();
    }
  });

  it("lists inserted candidates in dashboard-compatible shape", async () => {
    const pool = await createTestDatabasePool();

    try {
      await insertCandidate(pool, {
        address: "Queen St W & Spadina Ave",
        latitude: 43.6487,
        longitude: -79.396,
        confidenceScore: 80,
        severity: "high",
        uniqueSourceCount: 4,
        eventCount: 10,
      });

      const candidates = await listCandidates(pool);

      expect(candidates[0]).toMatchObject({
        address: "Queen St W & Spadina Ave",
        confidenceScore: 80,
        severity: "high",
        uniqueSourceCount: 4,
        eventCount: 10,
      });
    } finally {
      await pool.end();
    }
  });
});
