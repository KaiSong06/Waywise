import { createTestApp } from "../test/appTestHarness.js";

describe("pothole candidate routes", () => {
  it("returns map candidates as GeoJSON", async () => {
    const listMapCandidates = vi.fn(async () => ({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: "candidate-1",
          geometry: { type: "Point", coordinates: [-79.396, 43.6487] },
          properties: {
            id: "candidate-1",
            address: "Queen St W & Spadina Ave",
            latitude: 43.6487,
            longitude: -79.396,
            confidenceScore: 91,
            severity: "high",
            heatRadiusMeters: 34,
            heatIntensity: 0.9,
            uniqueSourceCount: 8,
            eventCount: 21,
            averageImpactMagnitude: 7.8,
            peakImpactMagnitude: 9.4,
            firstDetectedAt: "2026-05-10T09:00:00.000Z",
            lastDetectedAt: "2026-05-10T14:00:00.000Z",
            status: "verified",
          },
        },
      ],
    }));
    const app = await createTestApp({
      candidateReadService: {
        listMapCandidates,
        getCandidateDetail: vi.fn(),
        getDashboardSummary: vi.fn(),
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/pothole-candidates/map?severity=high&status=verified&minConfidence=70",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().type).toBe("FeatureCollection");
    expect(response.json().features[0].properties.confidenceScore).toBe(91);
    expect(listMapCandidates).toHaveBeenCalledWith({
      severities: ["high"],
      statuses: ["verified"],
      minConfidence: 70,
      lastDetectedWithinHours: undefined,
      activeOnly: true,
    });
  });

  it("persists candidate status changes", async () => {
    const updateStatus = vi.fn(async () => ({
      id: "candidate-1",
      status: "assigned",
    }));
    const app = await createTestApp({
      statusWorkflowService: {
        updateStatus,
      },
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/api/pothole-candidates/candidate-1/status",
      payload: {
        status: "assigned",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: "candidate-1",
      status: "assigned",
    });
    expect(updateStatus).toHaveBeenCalledWith("candidate-1", "assigned", undefined);
  });

  it("rejects invalid map filters", async () => {
    const listMapCandidates = vi.fn();
    const app = await createTestApp({
      candidateReadService: {
        listMapCandidates,
        getCandidateDetail: vi.fn(),
        getDashboardSummary: vi.fn(),
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/pothole-candidates/map?severity=critical&minConfidence=high",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "invalid_map_filter",
      invalidFilters: ["severity", "minConfidence"],
    });
    expect(listMapCandidates).not.toHaveBeenCalled();
  });

  it("returns dashboard summary metrics", async () => {
    const app = await createTestApp({
      candidateReadService: {
        listMapCandidates: vi.fn(),
        getCandidateDetail: vi.fn(),
        getDashboardSummary: vi.fn(async () => ({
          total: 3,
          active: 2,
          highSeverity: 1,
          averageConfidence: 74,
          byStatus: {
            monitoring: 1,
            verified: 1,
            assigned: 0,
            repaired: 1,
            recurring: 0,
          },
          bySeverity: {
            low: 1,
            medium: 1,
            high: 1,
          },
        })),
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/dashboard/summary",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      total: 3,
      active: 2,
      highSeverity: 1,
      averageConfidence: 74,
    });
  });

  it("rejects invalid status changes", async () => {
    const updateStatus = vi.fn();
    const app = await createTestApp({
      statusWorkflowService: {
        updateStatus,
      },
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/api/pothole-candidates/candidate-1/status",
      payload: {
        status: "closed",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(updateStatus).not.toHaveBeenCalled();
  });
});
