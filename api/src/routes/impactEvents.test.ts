import { createTestApp } from "../test/appTestHarness.js";

describe("impact event routes", () => {
  it("accepts an iOS-shaped impact event payload", async () => {
    const app = await createTestApp({
      impactIngestionService: {
        ingestImpactEvent: vi.fn(async () => ({
          accepted: true,
          eventId: "event-1",
          candidateId: "candidate-1",
        })),
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/impact-events",
      payload: {
        vehicleId: "ios-demo-1",
        driveSessionId: "session-1",
        latitude: 43.6487,
        longitude: -79.396,
        speed: 38,
        heading: 270,
        impactMagnitude: 8.2,
        verticalAcceleration: 2.8,
        timestamp: "2026-05-10T14:32:00Z",
      },
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({
      accepted: true,
      eventId: "event-1",
      candidateId: "candidate-1",
    });
  });

  it("rejects malformed payloads before persistence", async () => {
    const ingestImpactEvent = vi.fn();
    const app = await createTestApp({
      impactIngestionService: {
        ingestImpactEvent,
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/impact-events",
      payload: {
        vehicleId: "ios-demo-1",
        driveSessionId: "session-1",
        latitude: 200,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(ingestImpactEvent).not.toHaveBeenCalled();
  });
});
