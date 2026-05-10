import type { ApiConfig } from "../config/env.js";
import type { DbPool } from "../db/pool.js";
import type { ImpactEventPayload, ImpactIngestionResult } from "../domain/impactEvent.js";
import {
  findDuplicateImpactEvent,
  insertImpactEvent,
  type DuplicateImpactSearchInput,
  type ImpactEventInput,
  type ImpactEventRecord,
} from "../repositories/impactEventsRepository.js";
import type { CandidateAssignmentService } from "./candidateAssignmentService.js";

export interface ImpactEventsRepository {
  findDuplicate(input: DuplicateImpactSearchInput): Promise<{ id: string } | null>;
  insertImpactEvent(input: ImpactEventInput): Promise<ImpactEventRecord>;
}

export interface ImpactIngestionService {
  ingestImpactEvent(payload: ImpactEventPayload): Promise<ImpactIngestionResult>;
}

export function createImpactIngestionService(options: {
  config: Pick<ApiConfig, "duplicateWindowSeconds" | "maxGpsAccuracyMeters">;
  pool?: DbPool;
  eventsRepository?: ImpactEventsRepository;
  candidateAssignmentService: Pick<CandidateAssignmentService, "assignEvent">;
}): ImpactIngestionService {
  const eventsRepository = options.eventsRepository ?? createPgImpactEventsRepository(options.pool);

  return {
    async ingestImpactEvent(payload) {
      const occurredAt = new Date(payload.timestamp);
      const sourceType = payload.sourceType ?? "ios_demo";
      const rejectionReason = await getRejectionReason(payload, occurredAt, options.config, eventsRepository);
      const event = await eventsRepository.insertImpactEvent({
        anonymousSourceId: payload.vehicleId,
        driveSessionId: payload.driveSessionId,
        sourceType,
        collectionMode: sourceType === "seeded_demo" ? "seeded" : "demo_send",
        appVersion: payload.appVersion,
        latitude: payload.latitude,
        longitude: payload.longitude,
        gpsAccuracyMeters: payload.gpsAccuracyMeters,
        speedKph: payload.speed,
        headingDegrees: payload.heading,
        impactMagnitude: payload.impactMagnitude,
        verticalAcceleration: payload.verticalAcceleration,
        occurredAt,
        sensorWindowSummary: payload.sensorWindowSummary,
        accepted: rejectionReason === undefined,
        rejectionReason,
      });

      if (!event.accepted) {
        return {
          accepted: false,
          eventId: event.id,
          rejectionReason,
        };
      }

      const assignment = await options.candidateAssignmentService.assignEvent(event.id);

      return {
        accepted: true,
        eventId: event.id,
        candidateId: assignment.candidateId,
      };
    },
  };
}

async function getRejectionReason(
  payload: ImpactEventPayload,
  occurredAt: Date,
  config: Pick<ApiConfig, "duplicateWindowSeconds" | "maxGpsAccuracyMeters">,
  eventsRepository: ImpactEventsRepository,
) {
  if (payload.gpsAccuracyMeters !== undefined && payload.gpsAccuracyMeters > config.maxGpsAccuracyMeters) {
    return "poor_gps_accuracy";
  }

  const duplicate = await eventsRepository.findDuplicate({
    anonymousSourceId: payload.vehicleId,
    driveSessionId: payload.driveSessionId,
    latitude: payload.latitude,
    longitude: payload.longitude,
    occurredAt,
    duplicateWindowSeconds: config.duplicateWindowSeconds,
    radiusMeters: 8,
  });

  if (duplicate) {
    return "duplicate_event";
  }

  return undefined;
}

function createPgImpactEventsRepository(pool: DbPool | undefined): ImpactEventsRepository {
  if (!pool) {
    throw new Error("A database pool is required when no impact events repository is provided");
  }

  return {
    findDuplicate(input) {
      return findDuplicateImpactEvent(pool, input);
    },
    insertImpactEvent(input) {
      return insertImpactEvent(pool, input);
    },
  };
}
