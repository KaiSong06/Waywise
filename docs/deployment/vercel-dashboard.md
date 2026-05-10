# Vercel Dashboard Deployment

This runbook deploys the Waywise React/Vite dashboard to Vercel and points it at the live Cloud Run
API.

## Required Values

- `VITE_MAPBOX_TOKEN`: Mapbox token used by `src/components/MapView.tsx`.
- `VITE_API_BASE_URL`: Cloud Run API base URL, for example `https://waywise-api-...run.app`.

Do not add secrets to frontend variables. Vite exposes `VITE_*` values to the browser.

## Deploy With Git

1. Import the repository into Vercel.
2. Use the repository root as the project root.
3. Keep the default Vite build settings unless Vercel fails to auto-detect them:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add production environment variables:
   - `VITE_MAPBOX_TOKEN`
   - `VITE_API_BASE_URL`
5. Deploy the production branch.

Vercel applies environment variable changes only to new deployments, so redeploy after changing
either value.

## Deploy With Vercel CLI

Install and authenticate the CLI if needed:

```bash
npm install -g vercel
vercel login
```

Link the project from the repo root:

```bash
vercel link
```

Set production environment variables:

```bash
vercel env add VITE_MAPBOX_TOKEN production
vercel env add VITE_API_BASE_URL production
```

Deploy to production:

```bash
vercel deploy --prod
```

Capture the final production URL from the CLI output or Vercel project dashboard.

## Close the CORS Loop

After the production URL is known, update Cloud Run:

```bash
export SERVICE_NAME="waywise-api"
export REGION="us-central1"
export CORS_ORIGINS="https://your-final-vercel-production-url.vercel.app"

gcloud run services update "$SERVICE_NAME" \
  --region="$REGION" \
  --update-env-vars="CORS_ORIGINS=$CORS_ORIGINS"
```

If you need Vercel Preview deployments to talk to the API, add their exact origins too. Avoid
wildcard origins for the no-auth demo API.

## Production Smoke Check

Open the Vercel production URL and verify:

- The header chip says `Live API connected`.
- Browser network requests call `VITE_API_BASE_URL`, not local fixture data.
- `/api/pothole-candidates/map` returns candidate features.
- Map heat areas, the candidate list, metric tiles, and detail panel render live data.
- Changing a candidate status persists after a hard refresh.
- The browser console has no CORS errors.

If the dashboard shows `Live API unavailable`, check:

- `VITE_API_BASE_URL` is the Cloud Run service URL without a trailing `/api`.
- A new Vercel deployment ran after the environment variable changed.
- Cloud Run `CORS_ORIGINS` contains the exact Vercel production origin.
- The Cloud Run API responds to `/api/health` and `/api/pothole-candidates/map`.

## References

- Vercel environment variables: https://vercel.com/docs/projects/environment-variables
- Vercel deployments: https://vercel.com/docs/deployments/deployment-methods
