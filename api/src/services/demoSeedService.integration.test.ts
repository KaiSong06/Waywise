import { buildDemoSeedEvents } from "../demo/demoSeedData.js";
import { createTestDatabasePool, describeWithDatabase } from "../test/databaseTestHarness.js";
import { createDemoSeedService } from "./demoSeedService.js";

describeWithDatabase("demo seed service database coordination", () => {
  it("seeds a given demo seed once when requests overlap", async () => {
    const pool = await createTestDatabasePool();
    const seedEvents = buildDemoSeedEvents("concurrent-seed");
    let ingestCount = 0;

    try {
      const service = createDemoSeedService({
        pool,
        impactIngestionService: {
          async ingestImpactEvent() {
            ingestCount += 1;
            await delay(5);
            return {
              accepted: true,
              eventId: `event-${ingestCount}`,
              candidateId: "candidate-1",
            };
          },
        },
        statusWorkflowService: {
          updateStatus: vi.fn(async (_candidateId, status) => ({
            id: "candidate-1",
            status,
          })),
        },
      });

      const results = await Promise.all([
        service.seedDemoFleet("concurrent-seed"),
        service.seedDemoFleet("concurrent-seed"),
      ]);
      const demoRuns = await pool.query<{ id: string; status: string }>(
        "SELECT id, status FROM demo_runs WHERE seed = $1",
        ["concurrent-seed"],
      );

      expect(demoRuns.rowCount).toBe(1);
      expect(new Set(results.map((result) => result.demoRunId)).size).toBe(1);
      expect(results.filter((result) => result.alreadySeeded)).toHaveLength(1);
      expect(ingestCount).toBe(seedEvents.length);
    } finally {
      await pool.end();
    }
  });
});

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
