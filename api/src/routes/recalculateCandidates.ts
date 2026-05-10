import type { FastifyInstance } from "fastify";
import type { CandidateAssignmentService } from "../services/candidateAssignmentService.js";

export async function registerRecalculateCandidateRoutes(
  app: FastifyInstance,
  candidateAssignmentService: Pick<CandidateAssignmentService, "recalculateUnassignedEvents">,
) {
  app.post("/api/pothole-candidates/recalculate", async () =>
    candidateAssignmentService.recalculateUnassignedEvents(),
  );
}
