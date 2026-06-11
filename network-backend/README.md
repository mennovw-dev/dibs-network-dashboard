# network-backend

Read-only Go/Gin API over de Dibs staging SQLite. Vertaalt listings/houses/reactions naar netwerk-concepten (`ListingNode`, `InteractionEdge`).

## Endpoints

| Method | Path | Beschrijving |
|--------|------|--------------|
| GET | `/health` | Health check |
| GET | `/api/v1/spatial/nodes` | Actieve listing-nodes (kaartpunten) |
| GET | `/api/v1/spatial/overlap` | Nodes + edges binnen een bounding box |

### `GET /api/v1/spatial/nodes`

Query params:
- `status` — default `active`
- `with_coordinates` — `true` om alleen punten met lat/lon te tonen

### `GET /api/v1/spatial/overlap`

Query params (verplicht):
- `min_lat`, `max_lat`, `min_lon`, `max_lon`

Response: `{ bounds, nodes, edges }`

## Lokaal

```bash
cd network-backend
go mod tidy
go run .
```

Zonder staging DB faalt de start — gebruik een read-only kopie of deploy op VPS.

## VPS deploy

```bash
cd ~/dibs-network-dashboard/network-backend
docker compose up -d --build
curl http://127.0.0.1:8010/health
curl "http://127.0.0.1:8010/api/v1/spatial/nodes"
```

De DB wordt read-only gemount (`:ro`). Writes falen op bestandsniveau.

## Schema-notitie

De API ondersteunt het huidige prod-schema (`listings`, `reactions`, `map_latitude`). Als staging nog op het oude schema draait (`likes`, geen `listings`), valt de API terug op `houses` + `likes`. Staging is momenteel leeg — na een DB-refresh van prod of nieuwe testdata verschijnen er nodes.
