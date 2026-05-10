import pg from "pg";
import type { ApiConfig } from "../config/env.js";

const { Pool } = pg;

export type DbPool = pg.Pool;
export type DbClient = pg.Pool | pg.PoolClient;

export function createPool(config: ApiConfig): DbPool {
  if (config.databaseUrl) {
    return new Pool({
      connectionString: config.databaseUrl,
      max: 10,
    });
  }

  if (config.cloudSqlConnectionName && config.databaseSocketPath) {
    return new Pool({
      host: `${config.databaseSocketPath}/${config.cloudSqlConnectionName}`,
      user: config.databaseUser,
      password: config.databasePassword,
      database: config.databaseName,
      max: 10,
    });
  }

  return new Pool({
    user: config.databaseUser,
    password: config.databasePassword,
    database: config.databaseName,
    max: 10,
  });
}
