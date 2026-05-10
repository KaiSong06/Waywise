# Waywise

Passive pothole detection demo dashboard.

## Dashboard

The current app is a React/Vite dashboard for the deployed demo. It can run in local fixture mode
or connect to the deployed Cloud Run API when `VITE_API_BASE_URL` is configured. The dashboard
renders a Mapbox-backed road map when a token is configured and falls back to an interactive map
preview without a token.

## Local Development

```bash
npm install
npm run dev
```

For the live Mapbox base map and backend API, copy `.env.example` to `.env` and set:

```bash
VITE_MAPBOX_TOKEN=your_mapbox_token
VITE_API_BASE_URL=https://your-cloud-run-service-url
```

Without `VITE_API_BASE_URL`, the dashboard uses fixture candidates for local development. Without
`VITE_MAPBOX_TOKEN`, the dashboard still runs with the built-in map preview.

## Verification

```bash
npm test
npm run build
```

## iOS Demo App

The native SwiftUI demo app lives in `ios/`. It is intended for a recorded demo where the phone
starts a demo drive, samples location and motion data, and uploads a manually triggered
road-impact event to the deployed backend.

```bash
cd ios
xcodegen generate --spec project.yml --project .
open Waywise.xcodeproj
```

Detailed run notes live in `ios/README.md`.

## Backend API

The backend lives in `api/` as a separate Fastify/TypeScript service for the Cloud Run
deployment.

```bash
npm install --prefix api
npm run api:dev
```

Useful backend checks:

```bash
npm run api:test
npm run api:build
```

For local PostGIS-backed integration tests:

```bash
docker compose -f api/docker-compose.yml up -d
TEST_DATABASE_URL=postgres://waywise:waywise@localhost:54329/waywise npm run api:test
```

Backend deployment notes live in `docs/deployment/backend-gcp.md` and the full GCP runbook lives
in `docs/deployment/live-demo-gcp.md`.

## Vercel

Deploy the repo as a Vite app. Configure `VITE_MAPBOX_TOKEN` and `VITE_API_BASE_URL` in Vercel
project environment variables for the live demo. After Vercel creates the production URL, add that
exact origin to the backend `CORS_ORIGINS` value.

Detailed Vercel notes live in `docs/deployment/vercel-dashboard.md`.

Use `docs/deployment/live-demo-checklist.md` immediately before recording or presenting.
