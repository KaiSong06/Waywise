import { createDemoSeedService } from "./demoSeedService.js";

describe("demo seed service", () => {
  it("runs seeded demo events through the impact ingestion path", async () => {
    const ingestImpactEvent = vi.fn(async () => ({
      accepted: true,
      eventId: "event-1",
      candidateId: "candidate-1",
    }));
    const updateStatus = vi.fn(async () => ({ id: "candidate-1", status: "verified" }));
    const service = createDemoSeedService({
      demoRunsRepository: {
        findCompletedDemoRunBySeed: vi.fn(async () => null),
        createDemoRun: vi.fn(async () => ({ id: "run-1" })),
        finishDemoRun: vi.fn(async () => ({ id: "run-1" })),
      },
      impactIngestionService: {
        ingestImpactEvent,
      },
      statusWorkflowService: {
        updateStatus,
      },
    });

    const result = await service.seedDemoFleet("test-seed");

    expect(result.alreadySeeded).toBe(false);
    expect(result.eventCount).toBeGreaterThan(0);
    expect(ingestImpactEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: "seeded_demo",
      }),
    );
    expect(updateStatus).toHaveBeenCalled();
  });

  it("does not reseed the same completed demo run twice", async () => {
    const ingestImpactEvent = vi.fn();
    const service = createDemoSeedService({
      demoRunsRepository: {
        findCompletedDemoRunBySeed: vi.fn(async () => ({
          id: "run-1",
          eventCount: 12,
          syntheticSourceCount: 4,
          targetLocationsCount: 2,
        })),
        createDemoRun: vi.fn(),
        finishDemoRun: vi.fn(),
      },
      impactIngestionService: {
        ingestImpactEvent,
      },
      statusWorkflowService: {
        updateStatus: vi.fn(),
      },
    });

    const result = await service.seedDemoFleet("test-seed");

    expect(result).toEqual({
      demoRunId: "run-1",
      alreadySeeded: true,
      eventCount: 12,
      syntheticSourceCount: 4,
      targetLocationsCount: 2,
    });
    expect(ingestImpactEvent).not.toHaveBeenCalled();
  });
});
