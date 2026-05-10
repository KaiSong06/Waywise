# Live Demo GCP Deployment

This runbook deploys the Waywise API to Cloud Run and connects it to Cloud SQL for PostgreSQL
with PostGIS. It assumes the dashboard will be deployed separately on Vercel.

Do not commit real project IDs, passwords, service URLs, or tokens. Keep them in your shell,
GCP, Vercel, or a private deployment note.

## Inputs

Set these values for the demo environment:

```bash
export PROJECT_ID="your-gcp-project"
export REGION="us-central1"
export AR_REPO="waywise"
export SERVICE_NAME="waywise-api"
export MIGRATION_JOB_NAME="waywise-api-migrate"
export SQL_INSTANCE="waywise-postgis"
export DB_NAME="waywise"
export DB_USER="waywise"
export DB_PASSWORD="replace-with-generated-password"
export CORS_ORIGINS="https://your-dashboard.vercel.app"
export IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$AR_REPO/waywise-api:$(git rev-parse --short HEAD)"
export CLOUD_SQL_CONNECTION_NAME="$PROJECT_ID:$REGION:$SQL_INSTANCE"
```

Use a short `SQL_INSTANCE` value. Cloud SQL Unix socket paths include the instance connection name
and can fail if the path is too long.

## Enable Services

```bash
gcloud config set project "$PROJECT_ID"

gcloud services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com
```

## Artifact Registry

Create the Docker repository once:

```bash
gcloud artifacts repositories create "$AR_REPO" \
  --repository-format=docker \
  --location="$REGION" \
  --description="Waywise demo container images"
```

Build and push the API image from the `api/` package:

```bash
gcloud builds submit api --tag "$IMAGE"
```

## Cloud SQL PostgreSQL

Create the instance once:

```bash
gcloud sql instances create "$SQL_INSTANCE" \
  --database-version=POSTGRES_16 \
  --region="$REGION" \
  --tier=db-f1-micro \
  --storage-size=10GB \
  --storage-auto-increase
```

Create the database and user:

```bash
gcloud sql databases create "$DB_NAME" --instance="$SQL_INSTANCE"

gcloud sql users create "$DB_USER" \
  --instance="$SQL_INSTANCE" \
  --password="$DB_PASSWORD"
```

PostGIS is enabled by the application migration `api/migrations/001_initial_schema.sql`, which runs
`CREATE EXTENSION IF NOT EXISTS postgis`.

## Production Migrations

Migrations must run before the API serves traffic with demo seeding enabled.

Create or update the migration job:

```bash
gcloud run jobs deploy "$MIGRATION_JOB_NAME" \
  --image="$IMAGE" \
  --region="$REGION" \
  --add-cloudsql-instances="$CLOUD_SQL_CONNECTION_NAME" \
  --command=node \
  --args=dist/db/migrate.js \
  --set-env-vars="NODE_ENV=production,DB_USER=$DB_USER,DB_PASSWORD=$DB_PASSWORD,DB_NAME=$DB_NAME,CLOUD_SQL_CONNECTION_NAME=$CLOUD_SQL_CONNECTION_NAME,DATABASE_SOCKET_PATH=/cloudsql"
```

Run it:

```bash
gcloud run jobs execute "$MIGRATION_JOB_NAME" \
  --region="$REGION" \
  --wait
```

Expected result:

- First run logs `Applied 001_initial_schema.sql`.
- Later runs log `No migrations to apply`.

If the job fails, do not deploy or enable `AUTO_SEED_DEMO`. Inspect the Cloud Run job logs, fix the
configuration or migration issue, and execute the job again.

## Cloud Run API Service

Deploy the API with startup seeding disabled first:

```bash
gcloud run deploy "$SERVICE_NAME" \
  --image="$IMAGE" \
  --region="$REGION" \
  --add-cloudsql-instances="$CLOUD_SQL_CONNECTION_NAME" \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,DB_USER=$DB_USER,DB_PASSWORD=$DB_PASSWORD,DB_NAME=$DB_NAME,CLOUD_SQL_CONNECTION_NAME=$CLOUD_SQL_CONNECTION_NAME,DATABASE_SOCKET_PATH=/cloudsql,CORS_ORIGINS=$CORS_ORIGINS,DEMO_MODE=true,AUTO_SEED_DEMO=false,CLUSTERING_RADIUS_METERS=20,DUPLICATE_WINDOW_SECONDS=30,MAX_GPS_ACCURACY_METERS=50"
```

Capture the service URL:

```bash
export API_URL="$(gcloud run services describe "$SERVICE_NAME" \
  --region="$REGION" \
  --format='value(status.url)')"

echo "$API_URL"
```

## Seed and Smoke-Test the API

Health check:

```bash
curl "$API_URL/api/health"
```

Seed demo data once:

```bash
curl -X POST "$API_URL/api/demo/seed" \
  -H "Content-Type: application/json" \
  -d '{"seed":"live-demo"}'
```

Fetch map data:

```bash
curl "$API_URL/api/pothole-candidates/map"
```

Fetch summary:

```bash
curl "$API_URL/api/dashboard/summary"
```

Optional status persistence check:

```bash
export CANDIDATE_ID="candidate-id-from-map-response"

curl -X PATCH "$API_URL/api/pothole-candidates/$CANDIDATE_ID/status" \
  -H "Content-Type: application/json" \
  -d '{"status":"assigned"}'

curl "$API_URL/api/pothole-candidates/$CANDIDATE_ID"
```

## Enable Startup Demo Seeding

Only enable this after migrations and smoke checks pass:

```bash
gcloud run services update "$SERVICE_NAME" \
  --region="$REGION" \
  --update-env-vars="AUTO_SEED_DEMO=true"
```

Startup seeding is idempotent by seed value and guarded by Postgres advisory locks, but it should
still stay disabled until the schema and database connection have been verified.

## Update CORS After Vercel Deployment

After Vercel creates the production dashboard URL, update the allowlist:

```bash
export CORS_ORIGINS="https://your-final-vercel-production-url.vercel.app"

gcloud run services update "$SERVICE_NAME" \
  --region="$REGION" \
  --update-env-vars="CORS_ORIGINS=$CORS_ORIGINS"
```

Then redeploy or refresh the Vercel dashboard and confirm browser requests to `API_URL` do not show
CORS errors.

## Secret Handling

The commands above use environment variables for speed in a demo project. For anything beyond the
demo, store `DB_PASSWORD` in Secret Manager and grant the Cloud Run service/job identity access to
the secret instead of passing the password with `--set-env-vars`.

## Troubleshooting

- Migration job cannot connect: confirm `--add-cloudsql-instances`, `CLOUD_SQL_CONNECTION_NAME`,
  `DATABASE_SOCKET_PATH=/cloudsql`, and the database credentials match the Cloud SQL instance.
- PostGIS extension fails: confirm the Cloud SQL database user has permission to create extensions
  and that migrations are running against the intended database.
- Empty map: run `POST /api/demo/seed`, then fetch `/api/dashboard/summary` and check Cloud Run logs
  for ingestion or candidate assignment errors.
- Vercel CORS failure: update `CORS_ORIGINS` with the exact production origin, including `https://`.
- Repeated seed confusion: use the same seed value for idempotent behavior, or deliberately choose a
  new seed when you want a new demo run.

## References

- Cloud Run container deployment: https://cloud.google.com/run/docs/deploying
- Cloud Run to Cloud SQL for PostgreSQL: https://cloud.google.com/sql/docs/postgres/connect-run
- Cloud SQL PostgreSQL extensions and PostGIS: https://cloud.google.com/sql/docs/postgres/extensions
- Cloud Run Jobs: https://cloud.google.com/run/docs/create-jobs
- Cloud Run Job command and args: https://cloud.google.com/run/docs/configuring/jobs/containers
- Artifact Registry Docker images: https://cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling
