import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";

describe("app startup", () => {
  it("auto-seeds demo data when configured", async () => {
    const seedDemoFleet = vi.fn(async () => ({
      demoRunId: "run-1",
      alreadySeeded: false,
      eventCount: 10,
      syntheticSourceCount: 5,
      targetLocationsCount: 2,
    }));
    const app = await createApp({
      config: loadEnv({
        NODE_ENV: "test",
        AUTO_SEED_DEMO: "true",
      }),
      demoSeedService: {
        seedDemoFleet,
      },
    });

    await app.ready();

    expect(seedDemoFleet).toHaveBeenCalledWith("auto-demo");

    await app.close();
  });
});
