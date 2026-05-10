export type Severity = "low" | "medium" | "high";

export type CandidateStatus = "monitoring" | "verified" | "assigned" | "repaired" | "recurring";

export interface PotholeCandidate {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  confidenceScore: number;
  severity: Severity;
  heatRadiusMeters: number;
  heatIntensity: number;
  uniqueSourceCount: number;
  eventCount: number;
  averageImpactMagnitude: number;
  peakImpactMagnitude: number;
  firstDetectedAt: string;
  lastDetectedAt: string;
  status: CandidateStatus;
}

export interface CandidateFilters {
  severities: Severity[];
  statuses: CandidateStatus[];
  minConfidence: number;
  lastDetectedWithinHours: number | "all";
}

export interface CandidateSummary {
  total: number;
  active: number;
  highSeverity: number;
  averageConfidence: number;
}

export type CandidateFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  PotholeCandidate
>;

const activeStatuses = new Set<CandidateStatus>(["monitoring", "verified", "assigned", "recurring"]);

export function filterCandidates(
  candidates: PotholeCandidate[],
  filters: CandidateFilters,
  now = new Date(),
): PotholeCandidate[] {
  return candidates.filter((candidate) => {
    if (!filters.severities.includes(candidate.severity)) {
      return false;
    }

    if (!filters.statuses.includes(candidate.status)) {
      return false;
    }

    if (candidate.confidenceScore < filters.minConfidence) {
      return false;
    }

    if (filters.lastDetectedWithinHours === "all") {
      return true;
    }

    const lastDetected = new Date(candidate.lastDetectedAt).getTime();
    const ageHours = (now.getTime() - lastDetected) / (1000 * 60 * 60);

    return ageHours <= filters.lastDetectedWithinHours;
  });
}

export function summarizeCandidates(candidates: PotholeCandidate[]): CandidateSummary {
  const averageConfidence =
    candidates.length === 0
      ? 0
      : Math.round(
          candidates.reduce((total, candidate) => total + candidate.confidenceScore, 0) /
            candidates.length,
        );

  return {
    total: candidates.length,
    active: candidates.filter((candidate) => activeStatuses.has(candidate.status)).length,
    highSeverity: candidates.filter((candidate) => candidate.severity === "high").length,
    averageConfidence,
  };
}

export function updateCandidateStatus(
  candidates: PotholeCandidate[],
  id: string,
  status: CandidateStatus,
): PotholeCandidate[] {
  return candidates.map((candidate) =>
    candidate.id === id
      ? {
          ...candidate,
          status,
        }
      : candidate,
  );
}

export function toCandidateFeatureCollection(
  candidates: PotholeCandidate[],
): CandidateFeatureCollection {
  return {
    type: "FeatureCollection",
    features: candidates.map((candidate) => ({
      type: "Feature",
      id: candidate.id,
      geometry: {
        type: "Point",
        coordinates: [candidate.longitude, candidate.latitude],
      },
      properties: candidate,
    })),
  };
}
