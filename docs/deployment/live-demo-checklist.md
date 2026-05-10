# Live Demo Checklist

Use this checklist immediately before recording or presenting the Waywise live demo.

## Backend

- [ ] Cloud SQL instance is running in the expected project and region.
- [ ] The Waywise database exists.
- [ ] Production migrations have run successfully.
- [ ] PostGIS and pgcrypto are installed in the database.
- [ ] Cloud Run API service is deployed from the intended image tag.
- [ ] Cloud Run API service has the Cloud SQL instance attached.
- [ ] Cloud Run API environment includes:
  - [ ] `NODE_ENV=production`
  - [ ] `DB_USER`
  - [ ] `DB_PASSWORD`
  - [ ] `DB_NAME`
  - [ ] `CLOUD_SQL_CONNECTION_NAME`
  - [ ] `DATABASE_SOCKET_PATH=/cloudsql`
  - [ ] `CORS_ORIGINS=https://your-vercel-production-origin`
  - [ ] `DEMO_MODE=true`
  - [ ] `AUTO_SEED_DEMO=true` or demo data was seeded manually
- [ ] `GET /api/health` returns ok from the Cloud Run URL.
- [ ] `POST /api/demo/seed` has been run or startup seeding is confirmed in logs.
- [ ] `GET /api/pothole-candidates/map` returns a non-empty GeoJSON `FeatureCollection`.
- [ ] `GET /api/dashboard/summary` returns non-zero demo counts.
- [ ] `PATCH /api/pothole-candidates/:id/status` persists a status change.

## Dashboard

- [ ] Vercel production deployment is current.
- [ ] Vercel production environment includes:
  - [ ] `VITE_MAPBOX_TOKEN`
  - [ ] `VITE_API_BASE_URL=https://your-cloud-run-service-url`
- [ ] A deployment was triggered after the latest Vercel environment variable changes.
- [ ] The Vercel production URL loads.
- [ ] The header chip says `Live API connected`.
- [ ] Browser network requests target the Cloud Run API URL.
- [ ] Browser console has no CORS errors.
- [ ] Map heat areas render.
- [ ] Candidate list renders live candidates.
- [ ] Detail panel opens for selected candidates.
- [ ] Status changes survive a hard refresh.

## Recording Readiness

- [ ] Browser is open to the final Vercel production URL.
- [ ] Map is zoomed/panned to show several yellow/orange/red heat areas.
- [ ] A high-severity red candidate is visible without extra filtering.
- [ ] Detail card shows confidence, severity, coordinates, source count, impact values, and status.
- [ ] Filter controls are in a useful default state for the story.
- [ ] Optional iOS proof clip uses the same Cloud Run `VITE_API_BASE_URL` backend URL.

## Quick Failure Triage

- Empty dashboard map: call `POST /api/demo/seed`, then re-check `/api/pothole-candidates/map`.
- `Live API unavailable`: confirm `VITE_API_BASE_URL` and redeploy Vercel after env changes.
- CORS error: update Cloud Run `CORS_ORIGINS` with the exact Vercel production origin.
- Map preview only: confirm `VITE_MAPBOX_TOKEN` is set in Vercel and a fresh deployment ran.
- Migration failure: keep `AUTO_SEED_DEMO=false`, inspect the Cloud Run migration job logs, and rerun the job after fixing configuration.
- Duplicate-looking seed data: use the same seed value for idempotent behavior, or check `demo_runs` before deliberately using a new seed.
