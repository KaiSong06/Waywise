import type { DbPool } from "../db/pool.js";
import type { CandidateStatus, SeverityLevel } from "../db/schema.js";
import type { CandidateRecord } from "../repositories/candidatesRepository.js";
import { getCandidateById, listCandidates } from "../repositories/candidatesRepository.js";
import { listStatusHistory } from "../repositories/statusHistoryRepository.js";

export interface CandidateMapFilters {
  severities?: SeverityLevel[];
  statuses?: CandidateStatus[];
  minConfidence?: number;
  lastDetectedWithinHours?: number;
  activeOnly: boolean;
}

export interface CandidateReadService {
  listMapCandidates(filters: CandidateMapFilters): Promise<CandidateFeatureCollection>;
  getCandidateDetail(id: string): Promise<CandidateDetail | null>;
}

export interface CandidateFeatureCollection {
  type: "FeatureCollection";
  features: CandidateFeature[];
}

interface CandidateFeature {
  type: "Feature";
  id: string;
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: CandidateProperties;
}

export interface CandidateProperties {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  confidenceScore: number;
  severity: SeverityLevel;
  heatRadiusMeters: number;
  heatIntensity: number;
  uniqueSourceCount: number;
  eventCount: number;
  averageImpactMagnitude: number;
  peakImpactMagnitude: number;
  firstDetectedAt: string | null;
  lastDetectedAt: string | null;
  status: CandidateStatus;
}

interface CandidateDetail extends CandidateProperties {
  statusHistory: Array<{
    id: string;
    oldStatus: CandidateStatus | null;
    newStatus: CandidateStatus;
    changedAt: string;
    note: string | null;
  }>;
}

const activeStatuses = new Set<CandidateStatus>(["monitoring", "verified", "assigned", "recurring"]);

export function createCandidateReadService(pool: DbPool): CandidateReadService {
  return {
    async listMapCandidates(filters) {
      const candidates = await listCandidates(pool);
      const filtered = candidates.filter((candidate) => matchesFilters(candidate, filters));

      return {
        type: "FeatureCollection",
        features: filtered.map(toFeature),
      };
    },

    async getCandidateDetail(id) {
      const candidate = await getCandidateById(pool, id);

      if (!candidate) {
        return null;
      }

      const history = await listStatusHistory(pool, id);

      return {
        ...toProperties(candidate),
        statusHistory: history.map((entry) => ({
          id: entry.id,
          oldStatus: entry.oldStatus,
          newStatus: entry.newStatus,
          changedAt: entry.changedAt.toISOString(),
          note: entry.note,
        })),
      };
    },
  };
}

function matchesFilters(candidate: CandidateRecord, filters: CandidateMapFilters) {
  if (filters.activeOnly && !filters.statuses && !activeStatuses.has(candidate.status)) {
    return false;
  }

  if (filters.severities && !filters.severities.includes(candidate.severity)) {
    return false;
  }

  if (filters.statuses && !filters.statuses.includes(candidate.status)) {
    return false;
  }

  if (filters.minConfidence !== undefined && candidate.confidenceScore < filters.minConfidence) {
    return false;
  }

  if (filters.lastDetectedWithinHours !== undefined && candidate.lastDetectedAt) {
    const ageHours = (Date.now() - candidate.lastDetectedAt.getTime()) / (1000 * 60 * 60);
    return ageHours <= filters.lastDetectedWithinHours;
  }

  return true;
}

function toFeature(candidate: CandidateRecord): CandidateFeature {
  return {
    type: "Feature",
    id: candidate.id,
    geometry: {
      type: "Point",
      coordinates: [candidate.longitude, candidate.latitude],
    },
    properties: toProperties(candidate),
  };
}

function toProperties(candidate: CandidateRecord): CandidateProperties {
  return {
    id: candidate.id,
    address: candidate.address,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    confidenceScore: candidate.confidenceScore,
    severity: candidate.severity,
    heatRadiusMeters: candidate.heatRadiusMeters,
    heatIntensity: candidate.heatIntensity,
    uniqueSourceCount: candidate.uniqueSourceCount,
    eventCount: candidate.eventCount,
    averageImpactMagnitude: candidate.averageImpactMagnitude,
    peakImpactMagnitude: candidate.peakImpactMagnitude,
    firstDetectedAt: candidate.firstDetectedAt?.toISOString() ?? null,
    lastDetectedAt: candidate.lastDetectedAt?.toISOString() ?? null,
    status: candidate.status,
  };
}
