# Backend GCP Deployment

The Waywise backend is the `api/` package. It is designed for Cloud Run with Cloud SQL for
PostgreSQL and PostGIS.

## Prerequisites

- A GCP project with Cloud Run and Cloud SQL enabled.
- A Cloud SQL PostgreSQL instance.
- A database user and database for Waywise.
- PostGIS enabled by running the API migrations against that database.
- The deployed Vercel dashboard origin for `CORS_ORIGINS`.

## Local Database

Start local PostGIS:

```bash
docker compose -f api/docker-compose.yml up -d
```

Use this local URL for development and integration tests:

```bash
DATABASE_URL=postgres://waywise:waywise@localhost:54329/waywise
TEST_DATABASE_URL=postgres://waywise:waywise@localhost:54329/waywise
```

The compose file uses the official PostGIS image with `linux/amd64` because that tag does not
publish an arm64 manifest. Apple Silicon machines will run it through Docker emulation.

## Migrations

Run migrations explicitly as a release step:

```bash
npm --prefix api run migrate
```

For production images and Cloud Run Jobs, build the API and run the compiled migration entrypoint:

```bash
npm --prefix api run build
npm --prefix api run migrate:prod
```

The runtime Docker image includes compiled `dist/` code and SQL migrations, so production
migration jobs should use `migrate:prod` or run `node dist/db/migrate.js` directly. Do not rely on
Cloud Run app startup to mutate schema. Startup may run multiple instances and should stay focused
on serving traffic. Demo data seeding is separate and controlled by `AUTO_SEED_DEMO`.

## Cloud Run Environment

Required values:

```bash
NODE_ENV=production
PORT=8080
DB_USER=...
DB_PASSWORD=...
DB_NAME=...
CLOUD_SQL_CONNECTION_NAME=project:region:instance
DATABASE_SOCKET_PATH=/cloudsql
CORS_ORIGINS=https://your-dashboard.vercel.app
DEMO_MODE=true
AUTO_SEED_DEMO=true
CLUSTERING_RADIUS_METERS=20
DUPLICATE_WINDOW_SECONDS=30
MAX_GPS_ACCURACY_METERS=50
```

`DATABASE_URL` is also supported for local or non-Cloud SQL deployments. For Cloud Run with
Cloud SQL, prefer the Cloud SQL socket settings above and attach the Cloud SQL instance to the
Cloud Run service.

## Demo Seeding

There are two supported paths:

- Set `AUTO_SEED_DEMO=true` so Cloud Run seeds `auto-demo` during startup.
- Call `POST /api/demo/seed` with an optional `{ "seed": "demo" }` body.

Seeding is idempotent by seed value. A completed seed run is not inserted twice, so repeated
deploys do not inflate confidence scores.

## Health and Smoke Checks

- `GET /api/health` verifies the API process is serving.
- `POST /api/demo/seed` populates demo data when auto-seeding is disabled.
- `GET /api/pothole-candidates/map` should return a GeoJSON FeatureCollection after seeding.
- `PATCH /api/pothole-candidates/:id/status` should persist a dashboard status change.

## Troubleshooting

- Empty map response: run demo seeding, then confirm impact events were accepted and candidates
  were created.
- CORS failure from Vercel: add the exact Vercel origin to `CORS_ORIGINS`.
- Migration failure: confirm the Cloud SQL user can create extensions and that PostGIS is
  supported on the instance.
- Startup seed failure: check Cloud Run logs for database connectivity, migration state, and
  seed idempotency errors.
