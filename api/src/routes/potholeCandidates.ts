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
  app.get<{ Querystring: MapQuery }>("/api/pothole-candidates/map", async (request, reply) => {
    const parsed = parseMapFilters(request.query);

    if (parsed.invalidFilters.length > 0) {
      return reply.code(400).send({
        error: "invalid_map_filter",
        invalidFilters: parsed.invalidFilters,
      });
    }

    return candidateReadService.listMapCandidates(parsed.filters);
  });

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

function parseMapFilters(query: MapQuery): { filters: CandidateMapFilters; invalidFilters: string[] } {
  const severities = parseList(query.severity, severityLevels);
  const statuses = parseList(query.status, candidateStatuses);
  const minConfidence = parseNumber(query.minConfidence, { min: 0, max: 100 });
  const lastDetectedWithinHours = parseNumber(query.lastDetectedWithinHours, { min: 0 });
  const invalidFilters = [
    ...(severities.invalid ? ["severity"] : []),
    ...(statuses.invalid ? ["status"] : []),
    ...(minConfidence.invalid ? ["minConfidence"] : []),
    ...(lastDetectedWithinHours.invalid ? ["lastDetectedWithinHours"] : []),
    ...(isInvalidActiveOnly(query.activeOnly) ? ["activeOnly"] : []),
  ];

  return {
    filters: {
      severities: severities.values,
      statuses: statuses.values,
      minConfidence: minConfidence.value,
      lastDetectedWithinHours: lastDetectedWithinHours.value,
      activeOnly: query.activeOnly === undefined ? true : query.activeOnly === "true",
    },
    invalidFilters,
  };
}

function parseList<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): { values?: T[]; invalid: boolean } {
  if (!value) {
    return { invalid: false };
  }

  const values = value.split(",").map((item) => item.trim());
  const allowedValues = values.filter((item): item is T => allowed.includes(item as T));

  return {
    values: allowedValues,
    invalid: allowedValues.length !== values.length,
  };
}

function parseNumber(value: string | undefined, options: { min?: number; max?: number } = {}) {
  if (value === undefined || value === "") {
    return { invalid: false };
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return { invalid: true };
  }

  if (options.min !== undefined && parsed < options.min) {
    return { invalid: true };
  }

  if (options.max !== undefined && parsed > options.max) {
    return { invalid: true };
  }

  return { value: parsed, invalid: false };
}

function isInvalidActiveOnly(value: string | undefined) {
  return value !== undefined && value !== "true" && value !== "false";
}
