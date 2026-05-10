import type { FastifyInstance } from "fastify";
import { impactEventPayloadSchema, type ImpactEventPayload } from "../domain/impactEvent.js";
import type { ImpactIngestionService } from "../services/impactIngestionService.js";

export async function registerImpactEventRoutes(
  app: FastifyInstance,
  impactIngestionService: ImpactIngestionService,
) {
  app.post<{ Body: ImpactEventPayload }>(
    "/api/impact-events",
    {
      schema: {
        body: impactEventPayloadSchema,
      },
    },
    async (request, reply) => {
      const result = await impactIngestionService.ingestImpactEvent(request.body);
      return reply.code(202).send(result);
    },
  );
}
