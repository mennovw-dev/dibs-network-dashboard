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

Geen Node/npm op de VPS nodig — de Docker build doet alles (Node 22 in de image):

```bash
docker compose up -d --build
```

Lokaal ontwikkelen/builden kan ook op je Windows-machine (`npm run build`), maar de VPS hoeft dat niet.

De container serveert `dist/` op poort 8012 (`serve`). **Geen nginx.**

Publieke toegang via **Cloudflare Tunnel** — zie [docs/cloudflare-tunnel.md](../docs/cloudflare-tunnel.md).

- **Optie A:** één hostname, path rules `/api/*` en `/ws` → `8010`, rest → `8012`
- **Optie B:** apart API-hostname → `8010`, dashboard-hostname → `8012` + `VITE_API_URL` bij build

## Statuskleuren

| Status | Kleur |
|--------|-------|
| `active` | groen |
| `paused` | goud (+ halo) |
| `closed` | rood (+ halo) |
| `draft` | grijs |
