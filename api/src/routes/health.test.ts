import { createTestApp } from "../test/appTestHarness.js";

describe("health routes", () => {
  it("returns API process health without requiring a database connection", async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      service: "waywise-api",
    });
  });
});
