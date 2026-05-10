import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import type { ApiConfig } from "./config/env.js";
import { loadEnv } from "./config/env.js";
import type { DbPool } from "./db/pool.js";
import { createPool } from "./db/pool.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerImpactEventRoutes } from "./routes/impactEvents.js";
import { registerPotholeCandidateRoutes } from "./routes/potholeCandidates.js";
import { registerRecalculateCandidateRoutes } from "./routes/recalculateCandidates.js";
import type { CandidateAssignmentService } from "./services/candidateAssignmentService.js";
import { createCandidateAssignmentService } from "./services/candidateAssignmentService.js";
import type { CandidateReadService } from "./services/candidateReadService.js";
import { createCandidateReadService } from "./services/candidateReadService.js";
import type { DemoSeedService } from "./services/demoSeedService.js";
import { createDemoSeedService } from "./services/demoSeedService.js";
import type { ImpactIngestionService } from "./services/impactIngestionService.js";
import { createImpactIngestionService } from "./services/impactIngestionService.js";
import type { StatusWorkflowService } from "./services/statusWorkflowService.js";
import { createStatusWorkflowService } from "./services/statusWorkflowService.js";
import { registerDemoRoutes } from "./routes/demo.js";

export interface AppOptions {
  config?: ApiConfig;
  pool?: DbPool;
  impactIngestionService?: ImpactIngestionService;
  candidateAssignmentService?: Pick<CandidateAssignmentService, "assignEvent" | "recalculateUnassignedEvents">;
  candidateReadService?: CandidateReadService;
  statusWorkflowService?: StatusWorkflowService;
  demoSeedService?: DemoSeedService;
}

export async function createApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadEnv();
  const pool = options.pool ?? createPool(config);
  const candidateAssignmentService =
    options.candidateAssignmentService ?? createCandidateAssignmentService({ pool, config });
  const candidateReadService = options.candidateReadService ?? createCandidateReadService(pool);
  const statusWorkflowService = options.statusWorkflowService ?? createStatusWorkflowService({ pool });
  const impactIngestionService =
    options.impactIngestionService ??
    createImpactIngestionService({
      pool,
      config,
      candidateAssignmentService,
    });
  const demoSeedService =
    options.demoSeedService ??
    createDemoSeedService({
      pool,
      impactIngestionService,
      statusWorkflowService,
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

      callback(null, false);
    },
  });

  await registerHealthRoutes(app);
  await registerImpactEventRoutes(app, impactIngestionService);
  await registerPotholeCandidateRoutes(app, candidateReadService, statusWorkflowService);
  await registerRecalculateCandidateRoutes(app, candidateAssignmentService);
  await registerDemoRoutes(app, demoSeedService);

  if (config.autoSeedDemo) {
    app.addHook("onReady", async () => {
      await demoSeedService.seedDemoFleet("auto-demo");
    });
  }

  app.addHook("onClose", async () => {
    if (!options.pool) {
      await pool.end();
    }
  });

  return app;
}
