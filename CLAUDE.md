# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Dark Vessels** — a maritime intelligence platform that "unmasks" hidden maritime activity by cross-referencing what satellites physically detect with what ships digitally report via AIS. Ships that disable AIS create a "data blind spot" used to hide illegal fishing, smuggling, or sanctions evasion.

**Core detection logic:** compare AIS broadcasts (who claims to be where) against satellite/SAR radar detections (who is physically present). Discrepancies = dark vessel candidates.

**Active data sources:**
- **aisstream.io WebSocket** — real-time AIS position + identity stream for EU waters (primary AIS source)
- **Sentinel-1 SAR (Copernicus Data Space)** — radar imagery detecting metallic hulls regardless of AIS state
- **AIS Hub REST API** — legacy fallback client (`internal/aishub/`), currently unused

**Key use cases:**
- Retroactive investigation: after an oil spill, identify which vessels were in the area even if AIS was off
- Flag "Impossible Travel": AIS reports ship in Mediterranean but satellite detects matching hull in Baltic Sea
- Identify ships staying offshore invisible to avoid port inspections

**Infrastructure:** PostgreSQL for persistence, React 19 + Vite frontend, Go 1.22 backend.

## Commands

### Frontend (`frontend/app/`)
```bash
npm run dev      # Dev server at http://localhost:5173
npm run build    # tsc -b && vite build
npm run lint     # ESLint
npm run preview  # Preview production build
```

### Backend (`backend/`)
```bash
make dev     # Hot-reload via air (install air first: go install github.com/air-verse/air@latest)
make run     # go run ./cmd/api  (sources .env automatically)
make build   # Compile to ./bin/api
make test    # go test -race ./...
make lint    # golangci-lint
make tidy    # go mod tidy && verify
```

### Database (Docker)
```bash
docker start darkvessel-db   # Start existing container
# First time:
docker run -d --name darkvessel-db -e POSTGRES_PASSWORD=secret -e POSTGRES_DB=darkvessel -p 5432:5432 postgres:16
```

## Architecture

```
frontend/app/      React 19 + Vite + TypeScript + Tailwind 4 + Mapbox GL
backend/           Go 1.22 + chi v5 + Zap logging + pgx/v5 + gorilla/websocket
```

**Data flow:** aisstream.io WebSocket streams real-time AIS messages into the poller; frontend polls REST endpoints every 30s. Vite dev proxy forwards `/api/` to `http://localhost:8080`. All handlers fall back to mock data when `DATABASE_URL` is unset.

### Frontend structure
- `src/hooks/` — `useVessels`, `useDashboardCards`, `useSatelliteDetections(area)`, `useVesselTrack(mmsi)`, `useCountUp`, `useRelativeTime`
- `src/components/` — `InteractiveMap`, `VesselModal`, `VesselPopup`, `RecentAlerts`, `VesselStatusBadge`, `MapLegend`
- `src/types/dashboard.ts` — `Vessel`, `VesselAlert`, `DashboardCard`, `SatelliteDetection` interfaces
- `src/lib/api.ts` — `fetchJSON<T>(path)` helper (base URL from `VITE_API_BASE_URL`)
- `src/lib/constants.ts` — `POLL_INTERVAL_MS=30000`, map defaults, risk thresholds
- Path alias: `@/` → `src/`

### Backend structure
- `cmd/api/main.go` — entry point: init DB → Sentinel client → aisstream client → Poller goroutine → HTTP server
- `internal/config/` — env-based config
- `internal/model/` — `Vessel` (with `confidence`, `risk_score`, `anomaly_flags`), `Alert`, `Position`, `Stats`, `SatelliteDetection`, `ScanArea`
- `internal/store/postgres.go` — PostgreSQL store; schema auto-migrates on startup
- `internal/aisstream/client.go` — WebSocket client for `wss://stream.aisstream.io/v0/stream`; merges `PositionReport` + `ShipStaticData`; auto-reconnects with exponential backoff
- `internal/aishub/client.go` — legacy REST client (unused)
- `internal/detector/detector.go` — `Analyse()` returns confidence (0–100), risk_score (0–100), anomaly_flags array
- `internal/detector/haversine.go` — `HaversineNM()` distance helper
- `internal/detection/detector.go` — older anomaly scorer (backup impl, still referenced)
- `internal/sentinel/client.go` — Sentinel Hub OAuth2 client + `FetchSARImage()` (512×512 PNG, 4-day window)
- `internal/sentinel/detect.go` — PNG parsing, threshold 155/255, flood-fill blobs (2–300px), `filterLandClutter()` (drops clusters with >5 neighbors within 4km)
- `internal/poller/poller.go` — AIS stream processor (`streamAIS` goroutine) + satellite ticker (default 12h); cross-refs detections within 5 NM
- `internal/handler/` — `VesselHandler`, `AlertHandler`, `SatelliteHandler`, `HealthHandler`
- `internal/server/server.go` — chi router
- `internal/middleware/` — CORS, request logging, panic recovery
- `pkg/response/` — `JSON()`, `Error()`, `NoContent()` helpers

### API routes
```
GET /ping
GET /api/v1/health
GET /api/v1/vessels                              all vessels (500 limit, DB or mock)
GET /api/v1/vessels/dark                         vessels silent >6h (200 limit)
GET /api/v1/vessels/{mmsi}/track                 last 20 positions for a vessel
GET /api/v1/alerts?limit=N                       recent alerts (default 50, max 500)
GET /api/v1/stats                                dashboard KPIs
GET /api/v1/satellite/detections?hours=24        SAR detections (?area=X, ?unmatched=true)
GET /api/v1/satellite/areas                      list of 16 EU scan area names
```

### Detection signals (`detector/detector.go`)
| Signal | Flags |
|--------|-------|
| AIS dark >24h | `EXTENDED_SILENCE` → CRITICAL |
| AIS dark 6-24h | `EXTENDED_SILENCE` → WARNING |
| Moored/anchored but SOG >0.5 kn | `NAVSTAT_MISMATCH` → WARNING |
| No IMO + no callsign on cargo/tanker | `MISSING_IDENTITY` → WARNING |
| Heading=511 while SOG >1 kn | `INVALID_HEADING` → INFO |
| Implied speed >vessel max × 1.15 | `IMPOSSIBLE_TRAVEL` → CRITICAL |

Scoring: `confidence` = 100 − penalties (lower = more suspicious). `risk_score` = additive bonuses (higher = more dangerous). One alert per vessel per 6h window (`CreateAlertIfNew`).

### Satellite scan areas (16 regions in `model/satellite.go`)
Celtic Sea, Bay of Biscay, English Channel (W+E), Southern/Central/Norwegian North Sea, Kattegat, Baltic Sea, Strait of Gibraltar, Western Mediterranean, Ligurian Sea, Tyrrhenian Sea, Ionian Sea, Adriatic Open, Aegean Sea. All bboxes placed over open ocean to minimise land clutter; density filter removes residual false positives.

## Environment Variables

**Frontend** (`.env` in `frontend/app/`):
- `VITE_MAPBOX_ACCESS_TOKEN` — required for map rendering
- `VITE_API_BASE_URL` — backend URL (defaults to `http://localhost:8080`)

**Backend** (`.env` in `backend/`):
- `DATABASE_URL` — PostgreSQL connection string (omit for mock data fallback)
- `AISSTREAM_API_KEY` — aisstream.io key (omit to disable AIS streaming)
- `SENTINEL_CLIENT_ID`, `SENTINEL_CLIENT_SECRET` — Copernicus Data Space credentials (omit for simulated SAR)
- `SENTINEL_SCAN_INTERVAL_HOURS` — SAR scan frequency (default: 12)
- `APP_PORT=8080`, `APP_ENV=development`, `LOG_LEVEL=debug`

## Key Design Decisions

- **Mock data fallback**: when `DATABASE_URL` is unset, all handlers return hardcoded vessels — keeps frontend dev unblocked
- **WebSocket AIS**: aisstream.io pushes messages in real-time; poller merges position + static data in-memory before upsert
- **Schema is auto-migrated** on startup via `CREATE TABLE IF NOT EXISTS` — no migration tool needed
- **Position history** kept 24h (pruned each poll); satellite detections kept 48h
- **SAR land clutter filter**: density heuristic — ships at sea are isolated, urban areas create tight clusters
- **React Compiler enabled** in Vite config — no manual `useMemo`/`useCallback` needed
- **Design tokens** defined in `src/index.css` as CSS variables (`--color-bg-ocean`, `--color-status-alert`, etc.) — use these instead of raw hex values
- **Makefile sources `.env`** before `go run` so env vars are available without manual export
