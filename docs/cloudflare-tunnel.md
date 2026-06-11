# Cloudflare Tunnel (geen nginx)

Op de VPS draait `cloudflared` via token (beheerd in Cloudflare Zero Trust dashboard). Geen nginx nodig.

## Lokale services

| Service | Poort | Doel |
|---------|-------|------|
| `network-backend` | `127.0.0.1:8010` | REST + WebSocket |
| `network-mcp` | `127.0.0.1:8011` | MCP (alleen via SSH-tunnel) |
| `network-frontend` | `127.0.0.1:8012` | Statische SPA (`serve`) |

## Optie A — Eén hostname met path rules (aanbevolen)

In **Cloudflare Zero Trust → Networks → Tunnels → [jouw tunnel] → Public Hostname**, voeg routes toe (volgorde telt: specifiek eerst):

| Path | Service |
|------|---------|
| `/api/*` | `http://127.0.0.1:8010` |
| `/ws` | `http://127.0.0.1:8010` |
| `/*` | `http://127.0.0.1:8012` |

Zet **WebSocket** aan voor de tunnel (standaard bij Cloudflare). Frontend build **zonder** extra env vars — gebruikt same-origin `/api` en `/ws`.

Backend CORS (in `network-backend/docker-compose.yml`):

```yaml
- CORS_ORIGINS=https://jouw-dashboard-hostname,http://127.0.0.1:8012
```

## Optie B — Twee hostnames

| Hostname | Service |
|----------|---------|
| `network-api.jouwdomein.nl` | `http://127.0.0.1:8010` |
| `network.jouwdomein.nl` | `http://127.0.0.1:8012` |

Build frontend met expliciete URLs:

```bash
VITE_API_URL=https://network-api.jouwdomein.nl \
VITE_WS_URL=wss://network-api.jouwdomein.nl/ws \
npm run build
```

CORS op backend moet `https://network.jouwdomein.nl` bevatten.

## MCP blijft via SSH

MCP (`8011`) niet publiek via Cloudflare — alleen lokaal + SSH-tunnel:

```bash
ssh -N -L 8011:127.0.0.1:8011 hospi@188.245.71.61
```

## Deploy checklist

```bash
cd ~/dibs-network-dashboard
git pull

cd network-backend && docker compose up -d --build
cd ../network-mcp && docker compose up -d --build
cd ../network-frontend && npm install && npm run build && docker compose up -d --build
```

Verifieer lokaal op de VPS:

```bash
curl http://127.0.0.1:8010/health
curl http://127.0.0.1:8012/
```

Daarna hostname/path rules in Cloudflare dashboard toevoegen of bijwerken.
