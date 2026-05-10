import type { DbClient, DbPool } from "./pool.js";

export async function lockTransactionAdvisoryKey(
  client: DbClient,
  namespace: number,
  key: number,
): Promise<void> {
  await client.query("SELECT pg_advisory_xact_lock($1, $2)", [namespace, key]);
}

export async function withSessionAdvisoryLock<T>(
  pool: DbPool,
  namespace: number,
  key: number,
  callback: () => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let locked = false;

  try {
    await client.query("SELECT pg_advisory_lock($1, $2)", [namespace, key]);
    locked = true;
    return await callback();
  } finally {
    try {
      if (locked) {
        await client.query("SELECT pg_advisory_unlock($1, $2)", [namespace, key]);
      }
    } finally {
      client.release();
    }
  }
}

export function hashAdvisoryLockKey(value: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash | 0;
}
