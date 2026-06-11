# network-frontend

React + Vite + MapLibre dashboard voor staging listings. Mijlpaal 3.

## Features

- Black-clean Dibs huisstijl (violet/cyan), MapLibre dark basemap
- Stad-select (`CitySwitcher`, registry in `src/lib/cities.ts`, `?city=` URL-param) — Utrecht eerst, 1 entry per nieuwe stad
- NL/ENG taaltoggle rechtsbovenin (lichtgewicht i18n, `src/i18n/`, localStorage)
- 3D-gebouwen via OpenStreetMap-extrusies (MapLibre `fill-extrusion`), aan/uit in Weergave-paneel
- Huis-cards direct op de kaart (HTML-markers) met foto, naam, wijk en status-tag
  - Max 6 uitgevouwen tegelijk (op prioriteit); rest is een dot, hover vouwt 'm uit (en klapt de laagste prioriteit in)
  - Hover = gouden outline; klik = inzoomen + naar voorgrond + detailpaneel
  - Foto's + wijk/straat/postcode/bio uit `src/lib/houses.ts` (staging-pack-v1), bestanden in `public/houses/`
- Live cursor-readout linksonder: wijk/straat/postcode onder de muis via PDOK reverse-geocode (`src/lib/geocode.ts`, gedebounced + gecachet)
- Klik op de kaart → straat-panel met listings op die straat/wijk, op tijd gesorteerd (links onder de metrics)
- "View over time"-toggle (Weergave) + timeline-scrubber onderaan die listings filtert op `listed_at` (soft tijdsdimensie, met play)
- Huisfoto's geoptimaliseerd naar WebP (`scripts/optimize-houses.mjs`, ~97% kleiner; `sharp` is geen runtime-dep)
- Initiële load via REST (`/api/v1/spatial/nodes`)
- Live updates via WebSocket (`/ws`, elke 10s snapshot)

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
| `active` | groen (+ halo) |
| `paused` | goud (+ halo) |
| `closed` | grijs |
| `draft` | gedimd grijs |

## Een stad toevoegen

Voeg één entry toe aan `CITIES` in `src/lib/cities.ts` (`id`, `name`, `center`, `zoom`, `pitch`, `bearing`, `bounds`). De switcher en `?city=`-routing werken dan automatisch.
