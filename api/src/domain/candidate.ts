import type { CandidateStatus, SeverityLevel } from "../db/schema.js";

export interface CandidateEvidenceEvent {
  id?: string;
  anonymousSourceId: string;
  impactMagnitude: number;
  latitude: number;
  longitude: number;
  occurredAt: Date;
  gpsAccuracyMeters?: number;
}

export interface CandidateScore {
  confidenceScore: number;
  severity: SeverityLevel;
  heatRadiusMeters: number;
  heatIntensity: number;
  uniqueSourceCount: number;
  eventCount: number;
  averageImpactMagnitude: number;
  peakImpactMagnitude: number;
  firstDetectedAt: Date | null;
  lastDetectedAt: Date | null;
}

export interface CandidateMapProperties extends CandidateScore {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  status: CandidateStatus;
}
