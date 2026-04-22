# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Dark Vessels** — a maritime intelligence platform that "unmasks" hidden maritime activity by cross-referencing what satellites physically detect with what ships digitally report via AIS. Ships that disable AIS create a "data blind spot" used to hide illegal fishing, smuggling, or sanctions evasion.

**Core detection logic:** compare AIS broadcasts (who claims to be where) against satellite/SAR radar detections (who is physically present). Discrepancies = dark vessel candidates.

**Planned data sources:**
- **AIS Hub API** — real-time GPS position, name, flag of broadcasting vessels (1 req/min rate limit)
- **Sentinel-1 SAR (Copernicus Hub)** — radar imagery detecting metallic hulls regardless of AIS state
- **EMSA Port Data** — verify if a silent vessel was recently cleared from a European port

**Key use cases:**
- Retroactive investigation: after an oil spill, identify which vessels were in the area even if AIS was off
- Flag "Impossible Travel": AIS reports ship in Mediterranean but satellite detects matching hull in Baltic Sea
- Identify ships staying offshore invisible to avoid port inspections

**Planned infrastructure:** PostgreSQL for persistence, Firebase for hosting. Full-stack: React 19 + Vite frontend, Go backend.

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
make run     # go run ./cmd/api
make build   # Compile to ./bin/api
make test    # go test -race ./...
make lint    # golangci-lint
make tidy    # go mod tidy && verify
```

## Architecture

```
frontend/app/      React 19 + Vite + TypeScript + Tailwind 4 + Mapbox GL
backend/           Go 1.22 + chi v5 + Zap logging
```

**Data flow:** Frontend polls `/api/v1/vessels` and `/api/v1/vessels/dark` every 30 seconds. Vite dev proxy forwards `/api/` to `http://localhost:8080`. Backend currently returns in-memory mock data (no database yet).

### Frontend structure
- `src/hooks/` — `useVessels` (fetching + polling) and `useDashboardCards` (KPI derivation)
- `src/components/` — layout, map (Mapbox markers + popups), vessel modal, alerts sidebar
- `src/types/` — `Vessel`, `VesselAlert`, `DashboardCard` interfaces
- `src/lib/` — `cn()` utility (clsx + tailwind-merge)
- Path alias: `@/` → `src/`

### Backend structure
- `cmd/api/main.go` — entry point: initialises DB, starts AIS poller, graceful shutdown
- `internal/config/` — env-based config (DB URL, AIS Hub username, poll interval)
- `internal/model/` — shared types: `Vessel`, `Alert`, `Position`, `Stats`
- `internal/store/postgres.go` — PostgreSQL store (vessels, positions, alerts); schema auto-migrates on startup
- `internal/aishub/client.go` — AIS Hub HTTP client; fetches EU waters bounding box (lat 30-72, lon -20-45)
- `internal/detection/detector.go` — anomaly scoring: returns worst-severity `Result` or nil
- `internal/sentinel/client.go` — Sentinel Hub OAuth2 client + SAR image fetch (POST with JavaScript evalscript)
- `internal/sentinel/detect.go` — PNG parsing, threshold (170/255), flood-fill blob detection, pixel→lat/lon conversion
- `internal/poller/poller.go` — two loops: AIS (every 60s) + satellite (every 12h); cross-references detections within 5 NM
- `internal/handler/` — `VesselHandler`, `AlertHandler`, `HealthHandler`; all fall back to mock data when store is nil
- `internal/server/` — chi router setup
- `internal/middleware/` — CORS, request logging, panic recovery
- `pkg/response/` — `JSON()`, `Error()`, `NoContent()` helpers

### API routes
```
GET /ping                                    heartbeat
GET /api/v1/health
GET /api/v1/vessels                          all vessels (DB or mock fallback)
GET /api/v1/vessels/dark                     vessels with last_ais older than 6 hours
GET /api/v1/alerts?limit=N                   recent alerts (default 50, max 500)
GET /api/v1/stats                            dashboard KPIs
GET /api/v1/satellite/detections?hours=24    all SAR detections
GET /api/v1/satellite/detections?unmatched=true  dark vessel candidates (no AIS match)
```

### Detection signals (scored in `detection/detector.go`)
| Signal | Severity | Confidence |
|--------|----------|------------|
| AIS dark >24h | CRITICAL | 85 |
| AIS dark 6-24h | WARNING | 55 |
| Moored/anchored but SOG >0.5 kn | WARNING | 65 |
| No IMO + no callsign on cargo/tanker | WARNING | 50 |
| Heading=511 (invalid) while SOG >1 kn | INFO | 30 |
| Implied speed >50 kn between positions | CRITICAL | 90 |

One alert per vessel per 6-hour window (dedup in `CreateAlertIfNew`). Confidence scores are additive (capped at 100).

## Environment Variables

**Frontend** (`.env` in `frontend/app/`):
- `VITE_MAPBOX_ACCESS_TOKEN` — required for map rendering

**Backend** (`.env` in `backend/`, copy from `.env.example`):
- `DATABASE_URL` — PostgreSQL connection string (omit to run with mock data)
- `AISHUB_USERNAME` — AIS Hub account username (omit to disable poller)
- `AIS_POLL_INTERVAL_SEC` — polling interval, minimum 60 (AIS Hub rate limit)
- `APP_PORT=8080`, `APP_ENV=development`, `LOG_LEVEL=debug`

## Key Design Decisions

- **Mock data fallback**: when `DATABASE_URL` is unset, all handlers return hardcoded vessels — keeps frontend partner unblocked
- **Poller requires both** `DATABASE_URL` and `AISHUB_USERNAME`; either missing disables it gracefully
- **Schema is auto-migrated** on startup via `CREATE TABLE IF NOT EXISTS` — no migration tool needed
- **Position history** kept 24h (pruned each poll cycle); used for impossible-travel detection
- **React Compiler enabled** in Vite config — no manual `useMemo`/`useCallback` needed
- **Design tokens** defined in `src/index.css` as CSS variables (`--color-bg-ocean`, `--color-status-alert`, etc.) — use these instead of raw hex values
- AIS Hub API docs: `backend/apiAnalysys.md`
