import { loadEnv } from "./env.js";

describe("loadEnv", () => {
  it("loads valid backend configuration with typed defaults", () => {
    const config = loadEnv({
      NODE_ENV: "test",
      PORT: "9090",
      DATABASE_URL: "postgres://waywise:waywise@localhost:5432/waywise",
      DB_USER: "waywise",
      DB_PASSWORD: "secret",
      DB_NAME: "waywise",
      CLOUD_SQL_CONNECTION_NAME: "project:us-central1:waywise",
      DATABASE_SOCKET_PATH: "/cloudsql",
      CORS_ORIGINS: "https://waywise.vercel.app,http://localhost:5173",
      AUTO_SEED_DEMO: "true",
      CLUSTERING_RADIUS_METERS: "18",
      DUPLICATE_WINDOW_SECONDS: "45",
      MAX_GPS_ACCURACY_METERS: "35",
      DEMO_MODE: "true",
    });

    expect(config).toMatchObject({
      nodeEnv: "test",
      port: 9090,
      databaseUrl: "postgres://waywise:waywise@localhost:5432/waywise",
      databaseUser: "waywise",
      databasePassword: "secret",
      databaseName: "waywise",
      cloudSqlConnectionName: "project:us-central1:waywise",
      databaseSocketPath: "/cloudsql",
      corsOrigins: ["https://waywise.vercel.app", "http://localhost:5173"],
      autoSeedDemo: true,
      clusteringRadiusMeters: 18,
      duplicateWindowSeconds: 45,
      maxGpsAccuracyMeters: 35,
      demoMode: true,
    });
  });

  it("uses local defaults when optional GCP settings are missing", () => {
    const config = loadEnv({
      NODE_ENV: "development",
    });

    expect(config.port).toBe(8080);
    expect(config.host).toBe("0.0.0.0");
    expect(config.databaseUrl).toBeUndefined();
    expect(config.corsOrigins).toEqual(["http://localhost:5173"]);
    expect(config.autoSeedDemo).toBe(false);
    expect(config.clusteringRadiusMeters).toBe(20);
    expect(config.duplicateWindowSeconds).toBe(30);
    expect(config.maxGpsAccuracyMeters).toBe(50);
    expect(config.demoMode).toBe(false);
  });

  it("accepts complete Cloud SQL socket settings without DATABASE_URL", () => {
    const config = loadEnv({
      NODE_ENV: "production",
      DB_USER: "waywise",
      DB_PASSWORD: "secret",
      DB_NAME: "waywise",
      CLOUD_SQL_CONNECTION_NAME: "project:us-central1:waywise",
      DATABASE_SOCKET_PATH: "/cloudsql",
    });

    expect(config.databaseUrl).toBeUndefined();
    expect(config).toMatchObject({
      databaseUser: "waywise",
      databasePassword: "secret",
      databaseName: "waywise",
      cloudSqlConnectionName: "project:us-central1:waywise",
      databaseSocketPath: "/cloudsql",
    });
  });

  it("fails fast for invalid numeric values", () => {
    expect(() =>
      loadEnv({
        NODE_ENV: "test",
        PORT: "not-a-port",
      }),
    ).toThrow("PORT must be a number");

    expect(() =>
      loadEnv({
        NODE_ENV: "test",
        CLUSTERING_RADIUS_METERS: "0",
      }),
    ).toThrow("CLUSTERING_RADIUS_METERS must be between 1 and 100");
  });

  it("fails fast for partial database configuration", () => {
    expect(() =>
      loadEnv({
        NODE_ENV: "production",
        DB_USER: "waywise",
      }),
    ).toThrow("DB_USER, DB_PASSWORD, and DB_NAME must be provided together");

    expect(() =>
      loadEnv({
        NODE_ENV: "production",
        DB_USER: "waywise",
        DB_PASSWORD: "secret",
        DB_NAME: "waywise",
        CLOUD_SQL_CONNECTION_NAME: "project:us-central1:waywise",
      }),
    ).toThrow(
      "Cloud SQL socket configuration requires DB_USER, DB_PASSWORD, DB_NAME, CLOUD_SQL_CONNECTION_NAME, and DATABASE_SOCKET_PATH",
    );
  });
});
