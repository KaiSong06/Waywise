export type AppEnvironment = "development" | "test" | "production";

export interface ApiConfig {
  nodeEnv: AppEnvironment;
  host: string;
  port: number;
  databaseUrl?: string;
  databaseUser?: string;
  databasePassword?: string;
  databaseName?: string;
  cloudSqlConnectionName?: string;
  databaseSocketPath?: string;
  corsOrigins: string[];
  autoSeedDemo: boolean;
  clusteringRadiusMeters: number;
  duplicateWindowSeconds: number;
  maxGpsAccuracyMeters: number;
  demoMode: boolean;
}

type RawEnv = Record<string, string | undefined>;

const defaultCorsOrigins = ["http://localhost:5173"];

export function loadEnv(env: RawEnv = process.env): ApiConfig {
  const nodeEnv = parseNodeEnv(env.NODE_ENV);
  const databaseUrl = emptyToUndefined(env.DATABASE_URL);
  const databaseUser = emptyToUndefined(env.DB_USER);
  const databasePassword = emptyToUndefined(env.DB_PASSWORD);
  const databaseName = emptyToUndefined(env.DB_NAME);
  const cloudSqlConnectionName = emptyToUndefined(env.CLOUD_SQL_CONNECTION_NAME);
  const databaseSocketPath = emptyToUndefined(env.DATABASE_SOCKET_PATH);

  validateDatabaseConfig({
    databaseUrl,
    databaseUser,
    databasePassword,
    databaseName,
    cloudSqlConnectionName,
    databaseSocketPath,
  });

  return {
    nodeEnv,
    host: env.HOST ?? "0.0.0.0",
    port: parseNumber("PORT", env.PORT, { defaultValue: 8080, min: 1, max: 65535 }),
    databaseUrl,
    databaseUser,
    databasePassword,
    databaseName,
    cloudSqlConnectionName,
    databaseSocketPath,
    corsOrigins: parseCsv(env.CORS_ORIGINS, defaultCorsOrigins),
    autoSeedDemo: parseBoolean("AUTO_SEED_DEMO", env.AUTO_SEED_DEMO, false),
    clusteringRadiusMeters: parseNumber("CLUSTERING_RADIUS_METERS", env.CLUSTERING_RADIUS_METERS, {
      defaultValue: 20,
      min: 1,
      max: 100,
    }),
    duplicateWindowSeconds: parseNumber("DUPLICATE_WINDOW_SECONDS", env.DUPLICATE_WINDOW_SECONDS, {
      defaultValue: 30,
      min: 1,
      max: 300,
    }),
    maxGpsAccuracyMeters: parseNumber("MAX_GPS_ACCURACY_METERS", env.MAX_GPS_ACCURACY_METERS, {
      defaultValue: 50,
      min: 1,
      max: 500,
    }),
    demoMode: parseBoolean("DEMO_MODE", env.DEMO_MODE, false),
  };
}

function parseNodeEnv(value: string | undefined): AppEnvironment {
  if (value === undefined || value === "") {
    return "development";
  }

  if (value === "development" || value === "test" || value === "production") {
    return value;
  }

  throw new Error("NODE_ENV must be development, test, or production");
}

function parseCsv(value: string | undefined, fallback: string[]) {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(name: string, value: string | undefined, defaultValue: boolean) {
  if (value === undefined || value === "") {
    return defaultValue;
  }

  if (["true", "1", "yes"].includes(value.toLowerCase())) {
    return true;
  }

  if (["false", "0", "no"].includes(value.toLowerCase())) {
    return false;
  }

  throw new Error(`${name} must be a boolean`);
}

function parseNumber(
  name: string,
  value: string | undefined,
  options: { defaultValue: number; min: number; max: number },
) {
  if (value === undefined || value === "") {
    return options.defaultValue;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a number`);
  }

  if (!Number.isInteger(parsed) || parsed < options.min || parsed > options.max) {
    throw new Error(`${name} must be between ${options.min} and ${options.max}`);
  }

  return parsed;
}

function emptyToUndefined(value: string | undefined) {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  return value;
}

function validateDatabaseConfig(config: {
  databaseUrl?: string;
  databaseUser?: string;
  databasePassword?: string;
  databaseName?: string;
  cloudSqlConnectionName?: string;
  databaseSocketPath?: string;
}) {
  const basicValues = [config.databaseUser, config.databasePassword, config.databaseName];
  const hasAnyBasicValue = basicValues.some(Boolean);
  const hasAllBasicValues = basicValues.every(Boolean);
  const hasAnySocketValue = Boolean(config.cloudSqlConnectionName || config.databaseSocketPath);
  const hasAllSocketValues = Boolean(config.cloudSqlConnectionName && config.databaseSocketPath);

  if (!config.databaseUrl && hasAnyBasicValue && !hasAllBasicValues) {
    throw new Error("DB_USER, DB_PASSWORD, and DB_NAME must be provided together");
  }

  if (hasAnySocketValue && (!hasAllSocketValues || !hasAllBasicValues)) {
    throw new Error(
      "Cloud SQL socket configuration requires DB_USER, DB_PASSWORD, DB_NAME, CLOUD_SQL_CONNECTION_NAME, and DATABASE_SOCKET_PATH",
    );
  }
}
