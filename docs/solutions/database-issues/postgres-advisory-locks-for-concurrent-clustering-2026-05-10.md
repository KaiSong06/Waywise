---
title: Postgres Advisory Locks for Concurrent Clustering
date: 2026-05-10
category: database-issues
module: Backend API ingestion and demo seeding
problem_type: database_issue
component: database
symptoms:
  - Concurrent nearby impact events created multiple pothole candidates instead of one cluster
  - Overlapping demo seed calls created multiple demo runs for the same seed
  - Cloud Run startup seeding could inflate dashboard confidence and severity data
root_cause: logic_error
resolution_type: code_fix
severity: high
tags: [postgres, advisory-locks, concurrency, cloud-run, postgis, demo-seeding, clustering]
---

# Postgres Advisory Locks for Concurrent Clustering

## Problem

The backend used read-before-write checks for both candidate assignment and demo seeding. That was correct in a single request path, but not under concurrent Cloud Run requests: nearby impact events could split into separate pothole candidates, and overlapping seed calls could duplicate demo data.

## Symptoms

- Eight concurrent assignments of nearby accepted impact events could create eight `pothole_candidates` rows instead of one.
- Two overlapping `seedDemoFleet("concurrent-seed")` calls could create two `demo_runs` rows.
- Repeated startup seeding under multiple Cloud Run instances could make demo heat areas look more confident or severe than the underlying evidence justified.

## What Didn't Work

- Checking `findCandidateWithinRadius` inside a transaction was not enough. Each transaction could read before any competing insert committed, then independently insert its own candidate.
- Checking only completed demo runs before creating a new run was not enough. Two seeders could both observe no completed run and both start inserting data.
- Event duplicate detection did not solve candidate races. It detects duplicate events from the same source/session/time window, not legitimate simultaneous events from different vehicles.
- A process-local lock would not solve the deployed case because Cloud Run can run multiple instances. The coordination point needs to be the shared database.

## Solution

Use PostgreSQL advisory locks for the two critical sections.

For candidate assignment, take transaction-scoped advisory locks on the event's snapped search area before running the radius lookup and possible insert:

```ts
await lockCandidateSearchArea(client, {
  latitude: event.latitude,
  longitude: event.longitude,
  radiusMeters: options.config.clusteringRadiusMeters,
});

const candidate = await findOrCreateCandidate(client, event, options.config.clusteringRadiusMeters);
```

`lockCandidateSearchArea` converts the latitude/longitude into meter-based cells, locks the cell and neighbors, and sorts lock keys before acquisition:

```ts
export async function lockCandidateSearchArea(client: DbClient, input: LockInput) {
  const lockKeys = candidateSearchAreaLockKeys(input);

  for (const key of lockKeys) {
    await lockTransactionAdvisoryKey(client, candidateClusterLockNamespace, key);
  }
}
```

For demo seeding, wrap the whole seed operation in a session-scoped advisory lock keyed by seed value:

```ts
return withSessionAdvisoryLock(
  options.pool,
  demoSeedLockNamespace,
  hashAdvisoryLockKey(seed),
  seedFleet,
);
```

This matters because one seed run performs many normal ingestion calls, each with its own database work. A transaction-scoped lock would be too narrow for the whole seed operation, so the service keeps one session lock while the seed executes and releases it in `finally`.

## Why This Works

Postgres advisory locks coordinate through the database, so they apply across Node processes and Cloud Run instances. That makes them a good fit for small critical sections where the data model does not have a natural unique constraint.

The candidate lock is transaction-scoped via `pg_advisory_xact_lock`, so it releases automatically when assignment commits or rolls back. Any concurrent assignment for the same search area waits, then re-runs `findCandidateWithinRadius` after the first transaction has inserted the candidate.

The demo seed lock is session-scoped via `pg_advisory_lock`, so it can cover the complete multi-step seed flow. The second seed call waits, then sees the completed run and returns `alreadySeeded: true` without ingesting the seeded events again.

## Prevention

- Add concurrency tests for any read-before-write path that creates shared database state.
- Test candidate assignment with overlapping `Promise.all` calls and a temporary delayed insert trigger to widen the race window.
- Test demo seeding by calling the same seed concurrently and asserting only one `demo_runs` row exists.
- Prefer database-level coordination over in-memory locks for Cloud Run behavior.
- Keep lock scopes small and deterministic: transaction locks for one atomic database workflow, session locks only when the workflow spans multiple transactions.

Regression examples:

```ts
await Promise.all(events.map((event) => service.assignEvent(event.id)));

const candidates = await listCandidates(pool);
expect(candidates).toHaveLength(1);
expect(candidates[0]).toMatchObject({
  eventCount: events.length,
  uniqueSourceCount: events.length,
});
```

```ts
const results = await Promise.all([
  service.seedDemoFleet("concurrent-seed"),
  service.seedDemoFleet("concurrent-seed"),
]);

expect(demoRuns.rowCount).toBe(1);
expect(new Set(results.map((result) => result.demoRunId)).size).toBe(1);
expect(results.filter((result) => result.alreadySeeded)).toHaveLength(1);
```

## Related Issues

- [docs/plans/2026-05-10-001-feat-backend-database-plan.md](../../plans/2026-05-10-001-feat-backend-database-plan.md) called out duplicate demo seeding as a high-impact risk.
- [docs/deployment/backend-gcp.md](../../deployment/backend-gcp.md) documents Cloud Run startup seeding, which is why database-level idempotency matters.
- No existing `docs/solutions/` entry covered this problem before this note.
