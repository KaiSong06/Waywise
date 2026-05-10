import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type pg from "pg";
import { loadEnv } from "../config/env.js";
import { migrationTableName } from "./schema.js";
import { createPool, type DbPool } from "./pool.js";
import { withTransaction } from "./transaction.js";

const currentFile = fileURLToPath(import.meta.url);
const apiRoot = path.resolve(path.dirname(currentFile), "../..");
const migrationsDirectory = path.join(apiRoot, "migrations");

export async function runMigrations(pool: DbPool): Promise<string[]> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${migrationTableName} (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const applied = await getAppliedMigrations(pool);
  const pending = files.filter((file) => !applied.has(file));
  const appliedNow: string[] = [];

  for (const filename of pending) {
    const sql = await readFile(path.join(migrationsDirectory, filename), "utf8");

    await withTransaction(pool, async (client) => {
      await client.query(sql);
      await client.query(`INSERT INTO ${migrationTableName} (filename) VALUES ($1)`, [filename]);
    });

    appliedNow.push(filename);
  }

  return appliedNow;
}

async function getAppliedMigrations(client: pg.Pool | pg.PoolClient) {
  const result = await client.query<{ filename: string }>(
    `SELECT filename FROM ${migrationTableName} ORDER BY filename`,
  );

  return new Set(result.rows.map((row) => row.filename));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const pool = createPool(loadEnv());

  try {
    const applied = await runMigrations(pool);
    const summary = applied.length === 0 ? "No migrations to apply" : `Applied ${applied.join(", ")}`;
    console.log(summary);
  } finally {
    await pool.end();
  }
}
