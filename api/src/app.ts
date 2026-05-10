import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import type { ApiConfig } from "./config/env.js";
import { loadEnv } from "./config/env.js";
import type { DbPool } from "./db/pool.js";
import { createPool } from "./db/pool.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerImpactEventRoutes } from "./routes/impactEvents.js";
import { registerRecalculateCandidateRoutes } from "./routes/recalculateCandidates.js";
import type { CandidateAssignmentService } from "./services/candidateAssignmentService.js";
import { createCandidateAssignmentService } from "./services/candidateAssignmentService.js";
import type { ImpactIngestionService } from "./services/impactIngestionService.js";
import { createImpactIngestionService } from "./services/impactIngestionService.js";

export interface AppOptions {
  config?: ApiConfig;
  pool?: DbPool;
  impactIngestionService?: ImpactIngestionService;
  candidateAssignmentService?: Pick<CandidateAssignmentService, "assignEvent" | "recalculateUnassignedEvents">;
}

export async function createApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadEnv();
  const pool = options.pool ?? createPool(config);
  const candidateAssignmentService =
    options.candidateAssignmentService ?? createCandidateAssignmentService({ pool, config });
  const impactIngestionService =
    options.impactIngestionService ??
    createImpactIngestionService({
      pool,
      config,
      candidateAssignmentService,
    });
  const app = Fastify({
    logger: config.nodeEnv === "test" ? false : true,
  });

  await app.register(cors, {
    origin(origin, callback) {
      if (origin === undefined || config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS"), false);
    },
  });

  await registerHealthRoutes(app);
  await registerImpactEventRoutes(app, impactIngestionService);
  await registerRecalculateCandidateRoutes(app, candidateAssignmentService);

  app.addHook("onClose", async () => {
    if (!options.pool) {
      await pool.end();
    }
  });

  return app;
}
