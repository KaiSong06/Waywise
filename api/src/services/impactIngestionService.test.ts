import { createImpactIngestionService } from "./impactIngestionService.js";

const baseEvent = {
  vehicleId: "ios-demo-1",
  driveSessionId: "session-1",
  latitude: 43.6487,
  longitude: -79.396,
  speed: 38,
  heading: 270,
  impactMagnitude: 8.2,
  verticalAcceleration: 2.8,
  timestamp: "2026-05-10T14:32:00Z",
};

describe("impact ingestion service", () => {
  it("stores valid iOS events and assigns accepted events to candidates", async () => {
    const insertImpactEvent = vi.fn(async (input) => ({
      id: "event-1",
      ...input,
      anonymousSourceId: input.anonymousSourceId,
      occurredAt: input.occurredAt,
      uploadedAt: new Date("2026-05-10T14:32:05Z"),
      sensorWindowSummary: null,
      accepted: true,
    }));
    const assignEvent = vi.fn(async () => ({ candidateId: "candidate-1" }));
    const service = createImpactIngestionService({
      config: { duplicateWindowSeconds: 30, maxGpsAccuracyMeters: 50 },
      eventsRepository: {
        findDuplicate: vi.fn(async () => null),
        insertImpactEvent,
      },
      candidateAssignmentService: {
        assignEvent,
      },
    });

    const result = await service.ingestImpactEvent(baseEvent);

    expect(result.accepted).toBe(true);
    expect(result.eventId).toBe("event-1");
    expect(result.candidateId).toBe("candidate-1");
    expect(insertImpactEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        anonymousSourceId: "ios-demo-1",
        driveSessionId: "session-1",
        sourceType: "ios_demo",
        speedKph: 38,
        headingDegrees: 270,
      }),
    );
    expect(assignEvent).toHaveBeenCalledWith("event-1");
  });

  it("marks duplicate events rejected and does not assign candidate evidence", async () => {
    const insertImpactEvent = vi.fn(async (input) => ({
      id: "event-duplicate",
      ...input,
      anonymousSourceId: input.anonymousSourceId,
      occurredAt: input.occurredAt,
      uploadedAt: new Date("2026-05-10T14:32:05Z"),
      sensorWindowSummary: null,
      accepted: false,
    }));
    const assignEvent = vi.fn();
    const service = createImpactIngestionService({
      config: { duplicateWindowSeconds: 30, maxGpsAccuracyMeters: 50 },
      eventsRepository: {
        findDuplicate: vi.fn(async () => ({ id: "existing-event" })),
        insertImpactEvent,
      },
      candidateAssignmentService: {
        assignEvent,
      },
    });

    const result = await service.ingestImpactEvent(baseEvent);

    expect(result.accepted).toBe(false);
    expect(result.rejectionReason).toBe("duplicate_event");
    expect(assignEvent).not.toHaveBeenCalled();
  });

  it("rejects poor GPS accuracy without candidate mutation", async () => {
    const assignEvent = vi.fn();
    const service = createImpactIngestionService({
      config: { duplicateWindowSeconds: 30, maxGpsAccuracyMeters: 25 },
      eventsRepository: {
        findDuplicate: vi.fn(async () => null),
        insertImpactEvent: vi.fn(async (input) => ({
          id: "event-poor-gps",
          ...input,
          anonymousSourceId: input.anonymousSourceId,
          occurredAt: input.occurredAt,
          uploadedAt: new Date("2026-05-10T14:32:05Z"),
          sensorWindowSummary: null,
          accepted: false,
        })),
      },
      candidateAssignmentService: {
        assignEvent,
      },
    });

    const result = await service.ingestImpactEvent({
      ...baseEvent,
      gpsAccuracyMeters: 80,
    });

    expect(result.accepted).toBe(false);
    expect(result.rejectionReason).toBe("poor_gps_accuracy");
    expect(assignEvent).not.toHaveBeenCalled();
  });
});
