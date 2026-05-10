import { describe, expect, it, vi } from "vitest";
import { createWaywiseApiClient } from "./waywiseApi";
import type { CandidateFilters } from "../domain/candidates";

const filters: CandidateFilters = {
  severities: ["high", "medium"],
  statuses: ["verified", "assigned"],
  minConfidence: 70,
  lastDetectedWithinHours: 24,
};

describe("Waywise API client", () => {
  it("fetches map candidates with dashboard filters", async () => {
    const fetcher = vi.fn(async () => jsonResponse(featureCollection()));
    const client = createWaywiseApiClient("https://api.example.test/", fetcher);

    const candidates = await client.listMapCandidates(filters);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      id: "candidate-1",
      address: "Queen St W & Spadina Ave",
      confidenceScore: 91,
      severity: "high",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(fetcher.mock.calls[0][0])).toBe(
      "https://api.example.test/api/pothole-candidates/map?severity=high%2Cmedium&status=verified%2Cassigned&minConfidence=70&lastDetectedWithinHours=24&activeOnly=true",
    );
  });

  it("updates candidate status", async () => {
    const fetcher = vi.fn(async () => jsonResponse({ id: "candidate-1", status: "assigned" }));
    const client = createWaywiseApiClient("https://api.example.test", fetcher);

    const result = await client.updateCandidateStatus("candidate-1", "assigned");

    expect(result).toEqual({ id: "candidate-1", status: "assigned" });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.test/api/pothole-candidates/candidate-1/status",
      {
        body: JSON.stringify({ status: "assigned" }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      },
    );
  });

  it("fails clearly when the API responds with an error", async () => {
    const fetcher = vi.fn(async () => jsonResponse({ error: "bad_gateway" }, { status: 502 }));
    const client = createWaywiseApiClient("https://api.example.test", fetcher);

    await expect(client.listMapCandidates(filters)).rejects.toThrow(
      "Waywise API request failed: 502 Bad Gateway",
    );
  });
});

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function featureCollection() {
  return {
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
  };
}
