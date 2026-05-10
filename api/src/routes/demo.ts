import type { FastifyInstance } from "fastify";
import type { DemoSeedService } from "../services/demoSeedService.js";

export async function registerDemoRoutes(app: FastifyInstance, demoSeedService: DemoSeedService) {
  app.post<{ Body: { seed?: string } }>(
    "/api/demo/seed",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          properties: {
            seed: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request) => demoSeedService.seedDemoFleet(request.body?.seed),
  );
}
