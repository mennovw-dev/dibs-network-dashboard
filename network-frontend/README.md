# network-frontend

React + Vite + MapLibre dashboard voor staging listings. Mijlpaal 3.

## Features

- Kaart met listing-nodes (kleur per status: groen/goud/rood/grijs)
- Initiële load via REST (`/api/v1/spatial/nodes`)
- Live updates via WebSocket (`/ws`, elke 10s snapshot)
- Hover-popup met naam, stad, status en reacties

## Lokaal ontwikkelen

Backend moet draaien op `127.0.0.1:8010` (VPS-tunnel of lokaal):

```bash
cd network-frontend
npm install
npm run dev
```

Open http://localhost:5173 — Vite proxyt `/api` en `/ws` naar de backend.

## Productie-build

```bash
npm run build
```

## VPS deploy (statisch)

```bash
npm run build
cd network-frontend
docker compose up -d --build
```

Dashboard: http://127.0.0.1:8012 (via SSH-tunnel: `ssh -L 8012:127.0.0.1:8012 ...`)

Nginx in de container proxyt `/api` en `/ws` naar `network-backend` op poort 8010.

## Statuskleuren

| Status | Kleur |
|--------|-------|
| `active` | groen |
| `paused` | goud (+ halo) |
| `closed` | rood (+ halo) |
| `draft` | grijs |
