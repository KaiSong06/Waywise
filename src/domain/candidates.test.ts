import {
  filterCandidates,
  summarizeCandidates,
  toCandidateFeatureCollection,
  updateCandidateStatus,
  type CandidateFilters,
  type PotholeCandidate,
} from "./candidates";

const candidates: PotholeCandidate[] = [
  {
    id: "queen-spadina",
    address: "Queen St W & Spadina Ave",
    latitude: 43.6487,
    longitude: -79.396,
    confidenceScore: 92,
    severity: "high",
    heatRadiusMeters: 38,
    heatIntensity: 0.92,
    uniqueSourceCount: 11,
    eventCount: 34,
    averageImpactMagnitude: 8.4,
    peakImpactMagnitude: 10.8,
    firstDetectedAt: "2026-05-10T09:12:00Z",
    lastDetectedAt: "2026-05-10T14:48:00Z",
    status: "verified",
  },
  {
    id: "dundas-bathurst",
    address: "Dundas St W & Bathurst St",
    latitude: 43.6521,
    longitude: -79.4059,
    confidenceScore: 67,
    severity: "medium",
    heatRadiusMeters: 26,
    heatIntensity: 0.63,
    uniqueSourceCount: 5,
    eventCount: 13,
    averageImpactMagnitude: 6.2,
    peakImpactMagnitude: 8.1,
    firstDetectedAt: "2026-05-09T10:00:00Z",
    lastDetectedAt: "2026-05-09T16:30:00Z",
    status: "assigned",
  },
  {
    id: "college-ossington",
    address: "College St & Ossington Ave",
    latitude: 43.6547,
    longitude: -79.4217,
    confidenceScore: 38,
    severity: "low",
    heatRadiusMeters: 16,
    heatIntensity: 0.31,
    uniqueSourceCount: 2,
    eventCount: 4,
    averageImpactMagnitude: 4.1,
    peakImpactMagnitude: 5.4,
    firstDetectedAt: "2026-05-07T08:00:00Z",
    lastDetectedAt: "2026-05-07T09:20:00Z",
    status: "monitoring",
  },
];

describe("candidate domain helpers", () => {
  it("filters by severity, status, minimum confidence, and recency", () => {
    const filters: CandidateFilters = {
      severities: ["high", "medium"],
      statuses: ["verified", "assigned"],
      minConfidence: 60,
      lastDetectedWithinHours: 36,
    };

    const result = filterCandidates(candidates, filters, new Date("2026-05-10T15:00:00Z"));

    expect(result.map((candidate) => candidate.id)).toEqual(["queen-spadina", "dundas-bathurst"]);
  });

  it("summarizes active candidates by severity and urgency", () => {
    const summary = summarizeCandidates(candidates);

    expect(summary.total).toBe(3);
    expect(summary.highSeverity).toBe(1);
    expect(summary.active).toBe(3);
    expect(summary.averageConfidence).toBe(66);
  });

  it("updates status without mutating the source collection", () => {
    const result = updateCandidateStatus(candidates, "college-ossington", "verified");

    expect(result.find((candidate) => candidate.id === "college-ossington")?.status).toBe("verified");
    expect(candidates.find((candidate) => candidate.id === "college-ossington")?.status).toBe("monitoring");
  });

  it("converts candidates into a Mapbox-ready GeoJSON feature collection", () => {
    const collection = toCandidateFeatureCollection([candidates[0]]);

    expect(collection.type).toBe("FeatureCollection");
    expect(collection.features[0].id).toBe("queen-spadina");
    expect(collection.features[0].geometry.coordinates).toEqual([-79.396, 43.6487]);
    expect(collection.features[0].properties.severity).toBe("high");
    expect(collection.features[0].properties.confidenceScore).toBe(92);
  });
});
