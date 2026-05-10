import { createTestDatabasePool, describeWithDatabase } from "../test/databaseTestHarness.js";
import { insertCandidate } from "./candidatesRepository.js";
import { insertStatusHistory, listStatusHistory } from "./statusHistoryRepository.js";

describeWithDatabase("status history repository", () => {
  it("records status history for a candidate", async () => {
    const pool = await createTestDatabasePool();

    try {
      const candidate = await insertCandidate(pool, {
        latitude: 43.6487,
        longitude: -79.396,
        status: "monitoring",
      });

      await insertStatusHistory(pool, {
        potholeCandidateId: candidate.id,
        oldStatus: "monitoring",
        newStatus: "verified",
        note: "field crew confirmed",
      });

      const history = await listStatusHistory(pool, candidate.id);

      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        potholeCandidateId: candidate.id,
        oldStatus: "monitoring",
        newStatus: "verified",
        note: "field crew confirmed",
      });
    } finally {
      await pool.end();
    }
  });
});
