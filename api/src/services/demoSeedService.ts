import { hashAdvisoryLockKey, withSessionAdvisoryLock } from "../db/advisoryLocks.js";
import type { DbPool } from "../db/pool.js";
import type { DemoRunRecord } from "../repositories/demoRunsRepository.js";
import {
  createDemoRun as createDemoRunInRepository,
  findCompletedDemoRunBySeed as findCompletedDemoRunBySeedInRepository,
  finishDemoRun as finishDemoRunInRepository,
} from "../repositories/demoRunsRepository.js";
import type { ImpactIngestionService } from "./impactIngestionService.js";
import type { StatusWorkflowService } from "./statusWorkflowService.js";
import { buildDemoSeedEvents, demoSyntheticSourceCount, demoTargetCount } from "../demo/demoSeedData.js";

const demoSeedLockNamespace = 20_260_511;

export interface DemoSeedResult {
  demoRunId: string;
  alreadySeeded: boolean;
  eventCount: number;
  syntheticSourceCount: number;
  targetLocationsCount: number;
}

export interface DemoSeedService {
  seedDemoFleet(seed?: string): Promise<DemoSeedResult>;
}

interface DemoRunsRepository {
  findCompletedDemoRunBySeed(seed: string): Promise<Pick<DemoRunRecord, "id" | "eventCount" | "syntheticSourceCount" | "targetLocationsCount"> | null>;
  createDemoRun(input: {
    seed: string;
    targetLocationsCount: number;
    syntheticSourceCount: number;
    eventCount: number;
  }): Promise<Pick<DemoRunRecord, "id">>;
  finishDemoRun(input: { id: string; status: "completed" | "failed"; errorMessage?: string }): Promise<unknown>;
}

export function createDemoSeedService(options: {
  pool?: DbPool;
  demoRunsRepository?: DemoRunsRepository;
  impactIngestionService: ImpactIngestionService;
  statusWorkflowService: Pick<StatusWorkflowService, "updateStatus">;
}): DemoSeedService {
  const demoRunsRepository = options.demoRunsRepository ?? createPgDemoRunsRepository(options.pool);

  return {
    async seedDemoFleet(seed = "default-demo") {
      const seedFleet = () => seedDemoFleetOnce(seed, demoRunsRepository, options);

      if (options.pool) {
        return withSessionAdvisoryLock(
          options.pool,
          demoSeedLockNamespace,
          hashAdvisoryLockKey(seed),
          seedFleet,
        );
      }

      return seedFleet();
    },
  };
}

async function seedDemoFleetOnce(
  seed: string,
  demoRunsRepository: DemoRunsRepository,
  options: {
    impactIngestionService: ImpactIngestionService;
    statusWorkflowService: Pick<StatusWorkflowService, "updateStatus">;
  },
): Promise<DemoSeedResult> {
  const existingRun = await demoRunsRepository.findCompletedDemoRunBySeed(seed);

  if (existingRun) {
    return {
      demoRunId: existingRun.id,
      alreadySeeded: true,
      eventCount: existingRun.eventCount,
      syntheticSourceCount: existingRun.syntheticSourceCount,
      targetLocationsCount: existingRun.targetLocationsCount,
    };
  }

  const seedEvents = buildDemoSeedEvents(seed);
  const run = await demoRunsRepository.createDemoRun({
    seed,
    targetLocationsCount: demoTargetCount(),
    syntheticSourceCount: demoSyntheticSourceCount(),
    eventCount: seedEvents.length,
  });
  const candidateStatusTargets = new Map<string, (typeof seedEvents)[number]["status"]>();

  try {
    for (const seedEvent of seedEvents) {
      const result = await options.impactIngestionService.ingestImpactEvent(seedEvent.event);

      if (result.candidateId) {
        candidateStatusTargets.set(result.candidateId, seedEvent.status);
      }
    }

    for (const [candidateId, status] of candidateStatusTargets) {
      await options.statusWorkflowService.updateStatus(candidateId, status, "demo seed");
    }

    await demoRunsRepository.finishDemoRun({
      id: run.id,
      status: "completed",
    });

    return {
      demoRunId: run.id,
      alreadySeeded: false,
      eventCount: seedEvents.length,
      syntheticSourceCount: demoSyntheticSourceCount(),
      targetLocationsCount: demoTargetCount(),
    };
  } catch (error) {
    await demoRunsRepository.finishDemoRun({
      id: run.id,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown seed failure",
    });
    throw error;
  }
}

function createPgDemoRunsRepository(pool: DbPool | undefined): DemoRunsRepository {
  if (!pool) {
    throw new Error("A database pool is required when no demo runs repository is provided");
  }

  return {
    findCompletedDemoRunBySeed(seed) {
      return findCompletedDemoRunBySeedInRepository(pool, seed);
    },
    createDemoRun(input) {
      return createDemoRunInRepository(pool, input);
    },
    finishDemoRun(input) {
      return finishDemoRunInRepository(pool, input);
    },
  };
}
