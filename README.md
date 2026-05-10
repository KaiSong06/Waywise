# Waywise

Passive pothole detection demo dashboard.

## Dashboard

The current app is a React/Vite dashboard skeleton for the deployed demo. It uses local
candidate fixture data shaped like the future Cloud Run GeoJSON API, renders a Mapbox-backed
road map when a token is configured, and falls back to an interactive map preview without a
token.

## Local Development

```bash
npm install
npm run dev
```

For the live Mapbox base map, copy `.env.example` to `.env` and set:

```bash
VITE_MAPBOX_TOKEN=your_mapbox_token
```

Without the token, the dashboard still runs with the built-in map preview.

## Verification

```bash
npm test
npm run build
```

## Vercel

Deploy the repo as a Vite app. Configure `VITE_MAPBOX_TOKEN` in Vercel project environment
variables when the live Mapbox basemap is needed.
