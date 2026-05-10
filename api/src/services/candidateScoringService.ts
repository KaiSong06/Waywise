import type { CandidateEvidenceEvent, CandidateScore } from "../domain/candidate.js";

export interface CandidateScoringInput {
  events: CandidateEvidenceEvent[];
  knownFeaturePenalty: number;
  now?: Date;
}

export function scoreCandidateEvidence(input: CandidateScoringInput): CandidateScore {
  const events = input.events;

  if (events.length === 0) {
    return {
      confidenceScore: 0,
      severity: "low",
      heatRadiusMeters: 12,
      heatIntensity: 0.2,
      uniqueSourceCount: 0,
      eventCount: 0,
      averageImpactMagnitude: 0,
      peakImpactMagnitude: 0,
      firstDetectedAt: null,
      lastDetectedAt: null,
    };
  }

  const now = input.now ?? new Date();
  const uniqueSourceCount = new Set(events.map((event) => event.anonymousSourceId)).size;
  const eventCount = events.length;
  const averageImpactMagnitude = round1(
    events.reduce((total, event) => total + event.impactMagnitude, 0) / eventCount,
  );
  const peakImpactMagnitude = round1(Math.max(...events.map((event) => event.impactMagnitude)));
  const sortedByTime = [...events].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  const firstDetectedAt = sortedByTime[0].occurredAt;
  const lastDetectedAt = sortedByTime[sortedByTime.length - 1].occurredAt;
  const gpsSpreadMeters = estimateGpsSpreadMeters(events);
  const averageGpsAccuracy =
    events.reduce((total, event) => total + (event.gpsAccuracyMeters ?? 10), 0) / eventCount;
  const ageHours = (now.getTime() - lastDetectedAt.getTime()) / (1000 * 60 * 60);

  const sourceScore = Math.min(uniqueSourceCount / 5, 1) * 40;
  const eventScore = Math.min(eventCount / 12, 1) * 18;
  const impactScore = Math.min(averageImpactMagnitude / 8, 1) * 22;
  const recencyScore = ageHours <= 24 ? 10 : ageHours <= 72 ? 6 : 2;
  const gpsScore = gpsSpreadMeters <= 15 && averageGpsAccuracy <= 20 ? 10 : gpsSpreadMeters <= 35 ? 5 : -6;
  const knownFeaturePenalty = Math.min(Math.max(input.knownFeaturePenalty, 0), 1) * 25;

  const confidenceScore = clampScore(
    Math.round(sourceScore + eventScore + impactScore + recencyScore + gpsScore - knownFeaturePenalty),
  );
  const adjustedImpact = averageImpactMagnitude * 0.65 + peakImpactMagnitude * 0.35;
  const severity = chooseSeverity(adjustedImpact, confidenceScore);

  return {
    confidenceScore,
    severity,
    heatRadiusMeters: Math.round(12 + confidenceScore * 0.22 + Math.min(eventCount, 20) * 0.5),
    heatIntensity: round2(Math.min(1, 0.2 + confidenceScore / 140 + severityIntensityBonus(severity))),
    uniqueSourceCount,
    eventCount,
    averageImpactMagnitude,
    peakImpactMagnitude,
    firstDetectedAt,
    lastDetectedAt,
  };
}

function chooseSeverity(adjustedImpact: number, confidenceScore: number) {
  if (adjustedImpact >= 7.2 && confidenceScore >= 65) {
    return "high";
  }

  if (adjustedImpact >= 5 || confidenceScore >= 50) {
    return "medium";
  }

  return "low";
}

function severityIntensityBonus(severity: "low" | "medium" | "high") {
  if (severity === "high") {
    return 0.12;
  }

  if (severity === "medium") {
    return 0.06;
  }

  return 0;
}

function estimateGpsSpreadMeters(events: CandidateEvidenceEvent[]) {
  const center = {
    latitude: events.reduce((total, event) => total + event.latitude, 0) / events.length,
    longitude: events.reduce((total, event) => total + event.longitude, 0) / events.length,
  };

  return Math.max(...events.map((event) => distanceMeters(center, event)));
}

function distanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const metersPerDegreeLatitude = 111_320;
  const metersPerDegreeLongitude = Math.cos((from.latitude * Math.PI) / 180) * 111_320;
  const latitudeMeters = (to.latitude - from.latitude) * metersPerDegreeLatitude;
  const longitudeMeters = (to.longitude - from.longitude) * metersPerDegreeLongitude;

  return Math.sqrt(latitudeMeters ** 2 + longitudeMeters ** 2);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
