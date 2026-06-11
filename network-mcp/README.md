# network-mcp

MCP-server voor live observability van de Dibs staging-omgeving. Mijlpaal 1 van het Network Dashboard-project.

## Tools

| Tool | Beschrijving |
|------|--------------|
| `inspect_logs` | Leest recente logs van `dibs-staging-dibs-backend-1` via Docker socket |
| `spatial_nodes` | Haalt listing-nodes op via `network-backend` |
| `spatial_overlap` | Haalt nodes + edges in een bounding box op via `network-backend` |

### `inspect_logs` parameters

- `tail` — aantal regels (default 100, max 1000)
- `since` — optioneel, RFC3339-timestamp of duur (bijv. `1h`)
- `timestamps` — Docker-timestamps meenemen (default `false`)

## Lokaal ontwikkelen

```bash
cd network-mcp
go mod tidy
go run .
```

Standaard luistert de server op `127.0.0.1:8011`. Zonder Docker socket geeft `inspect_logs` een fout — dat is verwacht op Windows.

Health check: `curl http://127.0.0.1:8011/health`

## VPS deploy

Op de VPS (na `git pull` in `/home/hospi/dibs-network-dashboard`):

```bash
cd network-mcp
docker compose up -d --build
docker compose logs -f
```

Verifieer dat de staging-container draait:

```bash
docker ps --filter name=dibs-staging-dibs-backend-1
```

## Cursor koppelen via SSH-tunnel

Op je lokale machine:

```bash
ssh -N -L 8011:127.0.0.1:8011 hospi@188.245.71.61
```

Voeg in Cursor MCP-config toe (`.cursor/mcp.json` of Settings → MCP):

```json
{
  "mcpServers": {
    "dibs-network": {
      "url": "http://127.0.0.1:8011"
    }
  }
}
```

## Omgevingsvariabelen

| Variabele | Default | Beschrijving |
|-----------|---------|--------------|
| `MCP_PORT` | `8011` | HTTP-poort |
| `MCP_LISTEN_ALL` | `false` (lokaal) / `true` (Docker) | Bind op `0.0.0.0` i.p.v. `127.0.0.1` |
| `STAGING_CONTAINER` | `dibs-staging-dibs-backend-1` | Container voor `inspect_logs` |
| `BACKEND_URL` | `http://host.docker.internal:8010` | URL van `network-backend` |
