import { createTestDatabasePool, describeWithDatabase } from "../test/databaseTestHarness.js";
import { insertImpactEvent } from "./impactEventsRepository.js";

describeWithDatabase("impact events repository", () => {
  it("inserts an event with source and session references", async () => {
    const pool = await createTestDatabasePool();

    try {
      const event = await insertImpactEvent(pool, {
        anonymousSourceId: "ios-demo-1",
        driveSessionId: "session-1",
        sourceType: "ios_demo",
        collectionMode: "demo_send",
        latitude: 43.6487,
        longitude: -79.396,
        gpsAccuracyMeters: 6,
        speedKph: 38,
        headingDegrees: 270,
        impactMagnitude: 8.2,
        verticalAcceleration: 2.8,
        occurredAt: new Date("2026-05-10T14:32:00Z"),
        sensorWindowSummary: { samples: 12 },
      });

      expect(event.anonymousSourceId).toBe("ios-demo-1");
      expect(event.driveSessionId).toBe("session-1");
      expect(event.accepted).toBe(true);
      expect(event.impactMagnitude).toBe(8.2);
      expect(event.sensorWindowSummary).toEqual({ samples: 12 });
    } finally {
      await pool.end();
    }
  });
});
