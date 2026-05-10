import type { FastifyInstance } from "fastify";
import { candidateStatuses, severityLevels, type CandidateStatus } from "../db/schema.js";
import type { CandidateMapFilters, CandidateReadService } from "../services/candidateReadService.js";
import type { StatusWorkflowService } from "../services/statusWorkflowService.js";

interface MapQuery {
  severity?: string;
  status?: string;
  minConfidence?: string;
  lastDetectedWithinHours?: string;
  activeOnly?: string;
}

export async function registerPotholeCandidateRoutes(
  app: FastifyInstance,
  candidateReadService: CandidateReadService,
  statusWorkflowService: StatusWorkflowService,
) {
  app.get<{ Querystring: MapQuery }>("/api/pothole-candidates/map", async (request) =>
    candidateReadService.listMapCandidates(parseMapFilters(request.query)),
  );

  app.get("/api/dashboard/summary", async () => candidateReadService.getDashboardSummary());

  app.get<{ Params: { id: string } }>("/api/pothole-candidates/:id", async (request, reply) => {
    const detail = await candidateReadService.getCandidateDetail(request.params.id);

    if (!detail) {
      return reply.code(404).send({ error: "candidate_not_found" });
    }

    return detail;
  });

  app.patch<{ Params: { id: string }; Body: { status: CandidateStatus; note?: string } }>(
    "/api/pothole-candidates/:id/status",
    {
      schema: {
        body: {
          type: "object",
          required: ["status"],
          additionalProperties: false,
          properties: {
            status: { type: "string", enum: candidateStatuses },
            note: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        return await statusWorkflowService.updateStatus(
          request.params.id,
          request.body.status,
          request.body.note,
        );
      } catch (error) {
        if (error instanceof Error && error.message === "candidate_not_found") {
          return reply.code(404).send({ error: "candidate_not_found" });
        }

        throw error;
      }
    },
  );
}

function parseMapFilters(query: MapQuery): CandidateMapFilters {
  return {
    severities: parseList(query.severity, severityLevels),
    statuses: parseList(query.status, candidateStatuses),
    minConfidence: parseNumber(query.minConfidence),
    lastDetectedWithinHours: parseNumber(query.lastDetectedWithinHours),
    activeOnly: query.activeOnly === undefined ? true : query.activeOnly !== "false",
  };
}

function parseList<T extends string>(value: string | undefined, allowed: readonly T[]): T[] | undefined {
  if (!value) {
    return undefined;
  }

  const values = value.split(",").map((item) => item.trim());
  return values.filter((item): item is T => allowed.includes(item as T));
}

function parseNumber(value: string | undefined) {
  if (value === undefined || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
