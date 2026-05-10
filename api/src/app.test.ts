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

  it("adds CORS headers for configured dashboard origins", async () => {
    const app = await createApp({
      config: loadEnv({
        NODE_ENV: "test",
        CORS_ORIGINS: "https://waywise.vercel.app,http://localhost:5173",
      }),
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/health",
      headers: {
        origin: "https://waywise.vercel.app",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("https://waywise.vercel.app");

    await app.close();
  });

  it("omits CORS headers for unconfigured browser origins", async () => {
    const app = await createApp({
      config: loadEnv({
        NODE_ENV: "test",
        CORS_ORIGINS: "https://waywise.vercel.app",
      }),
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/health",
      headers: {
        origin: "https://unexpected.example",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();

    await app.close();
  });
});
