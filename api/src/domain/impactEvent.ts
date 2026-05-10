import type { SourceType } from "../db/schema.js";

export interface ImpactEventPayload {
  vehicleId: string;
  driveSessionId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading?: number;
  impactMagnitude: number;
  verticalAcceleration?: number;
  gpsAccuracyMeters?: number;
  timestamp: string;
  sourceType?: SourceType;
  appVersion?: string;
  sensorWindowSummary?: unknown;
}

export interface ImpactIngestionResult {
  accepted: boolean;
  eventId: string;
  candidateId?: string;
  rejectionReason?: string;
}

export const impactEventPayloadSchema = {
  type: "object",
  required: [
    "vehicleId",
    "driveSessionId",
    "latitude",
    "longitude",
    "speed",
    "impactMagnitude",
    "timestamp",
  ],
  additionalProperties: false,
  properties: {
    vehicleId: { type: "string", minLength: 1 },
    driveSessionId: { type: "string", minLength: 1 },
    latitude: { type: "number", minimum: -90, maximum: 90 },
    longitude: { type: "number", minimum: -180, maximum: 180 },
    speed: { type: "number", minimum: 0 },
    heading: { type: "number", minimum: 0, exclusiveMaximum: 360 },
    impactMagnitude: { type: "number", minimum: 0 },
    verticalAcceleration: { type: "number" },
    gpsAccuracyMeters: { type: "number", minimum: 0 },
    timestamp: { type: "string", format: "date-time" },
    sourceType: { type: "string", enum: ["ios_demo", "seeded_demo"] },
    appVersion: { type: "string" },
    sensorWindowSummary: {},
  },
} as const;
