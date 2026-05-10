import type { DbPool } from "../db/pool.js";
import type { CandidateStatus } from "../db/schema.js";
import {
  updateCandidateStatus as updateCandidateStatusInRepository,
} from "../repositories/candidatesRepository.js";
import {
  insertStatusHistory as insertStatusHistoryInRepository,
} from "../repositories/statusHistoryRepository.js";
import { withTransaction } from "../db/transaction.js";

export interface StatusWorkflowService {
  updateStatus(id: string, status: CandidateStatus, note?: string): Promise<{ id: string; status: CandidateStatus }>;
}

interface StatusWorkflowRepositories {
  candidatesRepository: {
    updateCandidateStatus(
      id: string,
      status: CandidateStatus,
    ): Promise<{ id: string; previousStatus: CandidateStatus; status: CandidateStatus } | null>;
  };
  statusHistoryRepository: {
    insertStatusHistory(input: {
      potholeCandidateId: string;
      oldStatus: CandidateStatus | null;
      newStatus: CandidateStatus;
      note?: string;
    }): Promise<unknown>;
  };
}

export function createStatusWorkflowService(
  options: { pool: DbPool } | StatusWorkflowRepositories,
): StatusWorkflowService {
  if ("pool" in options) {
    return {
      async updateStatus(id, status, note) {
        return withTransaction(options.pool, async (client) => {
          const updated = await updateCandidateStatusInRepository(client, id, status);

          if (!updated) {
            throw new Error("candidate_not_found");
          }

          await insertStatusHistoryInRepository(client, {
            potholeCandidateId: id,
            oldStatus: updated.previousStatus,
            newStatus: status,
            note,
          });

          return {
            id: updated.id,
            status: updated.status,
          };
        });
      },
    };
  }

  const repositories =
    options;

  return {
    async updateStatus(id, status, note) {
      const updated = await repositories.candidatesRepository.updateCandidateStatus(id, status);

      if (!updated) {
        throw new Error("candidate_not_found");
      }

      await repositories.statusHistoryRepository.insertStatusHistory({
        potholeCandidateId: id,
        oldStatus: updated.previousStatus,
        newStatus: status,
        note,
      });

      return {
        id: updated.id,
        status: updated.status,
      };
    },
  };
}
