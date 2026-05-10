import { scoreCandidateEvidence } from "./candidateScoringService.js";

describe("candidate scoring", () => {
  it("keeps a single-source event lower confidence than repeated multi-source evidence", () => {
    const single = scoreCandidateEvidence({
      events: [
        {
          anonymousSourceId: "source-1",
          impactMagnitude: 8.6,
          latitude: 43.6487,
          longitude: -79.396,
          occurredAt: new Date("2026-05-10T12:00:00Z"),
          gpsAccuracyMeters: 6,
        },
      ],
      now: new Date("2026-05-10T15:00:00Z"),
      knownFeaturePenalty: 0,
    });

    const repeated = scoreCandidateEvidence({
      events: Array.from({ length: 9 }, (_, index) => ({
        anonymousSourceId: `source-${index + 1}`,
        impactMagnitude: 7.6 + index * 0.1,
        latitude: 43.6487 + index * 0.00001,
        longitude: -79.396 - index * 0.00001,
        occurredAt: new Date(`2026-05-10T1${index}:00:00Z`),
        gpsAccuracyMeters: 5,
      })),
      now: new Date("2026-05-10T15:00:00Z"),
      knownFeaturePenalty: 0,
    });

    expect(single.confidenceScore).toBeLessThan(repeated.confidenceScore);
    expect(single.confidenceScore).toBeLessThan(60);
    expect(repeated.confidenceScore).toBeGreaterThanOrEqual(80);
    expect(repeated.severity).toBe("high");
  });

  it("penalizes known road features without deleting candidate evidence", () => {
    const unpenalized = scoreCandidateEvidence({
      events: [
        {
          anonymousSourceId: "source-1",
          impactMagnitude: 7,
          latitude: 43.6487,
          longitude: -79.396,
          occurredAt: new Date("2026-05-10T14:00:00Z"),
          gpsAccuracyMeters: 5,
        },
        {
          anonymousSourceId: "source-2",
          impactMagnitude: 7.2,
          latitude: 43.64871,
          longitude: -79.39601,
          occurredAt: new Date("2026-05-10T14:10:00Z"),
          gpsAccuracyMeters: 5,
        },
      ],
      now: new Date("2026-05-10T15:00:00Z"),
      knownFeaturePenalty: 0,
    });

    const penalized = scoreCandidateEvidence({
      events: [
        {
          anonymousSourceId: "source-1",
          impactMagnitude: 7,
          latitude: 43.6487,
          longitude: -79.396,
          occurredAt: new Date("2026-05-10T14:00:00Z"),
          gpsAccuracyMeters: 5,
        },
        {
          anonymousSourceId: "source-2",
          impactMagnitude: 7.2,
          latitude: 43.64871,
          longitude: -79.39601,
          occurredAt: new Date("2026-05-10T14:10:00Z"),
          gpsAccuracyMeters: 5,
        },
      ],
      now: new Date("2026-05-10T15:00:00Z"),
      knownFeaturePenalty: 0.8,
    });

    expect(penalized.eventCount).toBe(2);
    expect(penalized.confidenceScore).toBeLessThan(unpenalized.confidenceScore);
  });
});
