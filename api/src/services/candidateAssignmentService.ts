import type { ApiConfig } from "../config/env.js";
import type { DbClient, DbPool } from "../db/pool.js";
import { withTransaction } from "../db/transaction.js";
import {
  findCandidateWithinRadius,
  getCandidateEvidence,
  insertCandidate,
  linkCandidateEvent,
  updateCandidateScore,
} from "../repositories/candidatesRepository.js";
import {
  findImpactEventById,
  listUnassignedAcceptedImpactEvents,
  type ImpactEventRecord,
} from "../repositories/impactEventsRepository.js";
import { scoreCandidateEvidence } from "./candidateScoringService.js";

export interface CandidateAssignmentService {
  assignEvent(eventId: string): Promise<{ candidateId?: string }>;
  recalculateUnassignedEvents(): Promise<{ assignedEventCount: number }>;
}

export function createCandidateAssignmentService(options: {
  pool: DbPool;
  config: Pick<ApiConfig, "clusteringRadiusMeters">;
}): CandidateAssignmentService {
  const service: CandidateAssignmentService = {
    async assignEvent(eventId: string) {
      return withTransaction(options.pool, async (client) => {
        const event = await findImpactEventById(client, eventId);

        if (!event || !event.accepted) {
          return {};
        }

        const candidate = await findOrCreateCandidate(client, event, options.config.clusteringRadiusMeters);
        await linkCandidateEvent(client, {
          candidateId: candidate.id,
          eventId: event.id,
        });

        const evidence = await getCandidateEvidence(client, candidate.id);
        const score = scoreCandidateEvidence({
          events: evidence,
          knownFeaturePenalty: 0,
        });
        await updateCandidateScore(client, candidate.id, score);

        return {
          candidateId: candidate.id,
        };
      });
    },

    async recalculateUnassignedEvents() {
      const events = await listUnassignedAcceptedImpactEvents(options.pool);
      let assignedEventCount = 0;

      for (const event of events) {
        const result = await service.assignEvent(event.id);

        if (result.candidateId) {
          assignedEventCount += 1;
        }
      }

      return { assignedEventCount };
    },
  };

  return service;
}

async function findOrCreateCandidate(
  client: DbClient,
  event: ImpactEventRecord,
  radiusMeters: number,
) {
  const match = await findCandidateWithinRadius(client, {
    latitude: event.latitude,
    longitude: event.longitude,
    radiusMeters,
  });

  if (match) {
    return match;
  }

  return insertCandidate(client, {
    latitude: event.latitude,
    longitude: event.longitude,
    address: extractAddress(event.sensorWindowSummary),
    firstDetectedAt: event.occurredAt,
    lastDetectedAt: event.occurredAt,
  });
}

function extractAddress(sensorWindowSummary: unknown) {
  if (
    sensorWindowSummary &&
    typeof sensorWindowSummary === "object" &&
    "target" in sensorWindowSummary &&
    typeof sensorWindowSummary.target === "string"
  ) {
    return sensorWindowSummary.target;
  }

  return undefined;
}
