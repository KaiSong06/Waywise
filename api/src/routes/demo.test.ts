import { createTestApp } from "../test/appTestHarness.js";

describe("demo routes", () => {
  it("seeds the demo fleet on demand", async () => {
    const seedDemoFleet = vi.fn(async () => ({
      demoRunId: "run-1",
      alreadySeeded: false,
      eventCount: 20,
      syntheticSourceCount: 8,
      targetLocationsCount: 3,
    }));
    const app = await createTestApp({
      demoSeedService: {
        seedDemoFleet,
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/demo/seed",
      payload: {
        seed: "demo",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      demoRunId: "run-1",
      alreadySeeded: false,
      eventCount: 20,
      syntheticSourceCount: 8,
      targetLocationsCount: 3,
    });
    expect(seedDemoFleet).toHaveBeenCalledWith("demo");
  });
});
