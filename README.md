# Dibs Network Dashboard

Monorepo voor netwerk-observability naast Dibs core.

| Subproject | Status | Beschrijving |
|------------|--------|--------------|
| `network-mcp/` | **actief** | MCP-server voor AI/dev tooling (mijlpaal 1) |
| `network-backend/` | **actief** | Go API, read-only staging DB (mijlpaal 2) |
| `network-frontend/` | gepland | React/MapLibre dashboard (mijlpaal 3) |

## Quick start (mijlpaal 1)

```bash
cd network-mcp
go run .
```

Zie [network-mcp/README.md](network-mcp/README.md) voor VPS-deploy en Cursor SSH-tunnel setup.
