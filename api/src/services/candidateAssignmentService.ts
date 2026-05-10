import type { ApiConfig } from "../config/env.js";
import type { DbPool } from "../db/pool.js";
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
  return {
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
        const result = await this.assignEvent(event.id);

        if (result.candidateId) {
          assignedEventCount += 1;
        }
      }

      return { assignedEventCount };
    },
  };
}

async function findOrCreateCandidate(
  client: DbPool | Parameters<typeof findCandidateWithinRadius>[0],
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
    firstDetectedAt: event.occurredAt,
    lastDetectedAt: event.occurredAt,
  });
}
