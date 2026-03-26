# go-backend

A production-ready Go backend scaffold using **chi**, **zap**, and **air**.

## Stack

| Concern        | Library                         |
|----------------|---------------------------------|
| Routing / mux  | `github.com/go-chi/chi/v5`      |
| Structured log | `go.uber.org/zap`               |
| Hot reload     | `github.com/air-verse/air`      |

## Project layout

```
.
├── cmd/
│   └── api/
│       └── main.go          # Entrypoint — wires config, logger, server
├── internal/
│   ├── config/
│   │   └── config.go        # Env-var config with defaults
│   ├── handler/
│   │   └── health.go        # HTTP handlers (one file per resource)
│   ├── logger/
│   │   └── logger.go        # Zap logger factory
│   ├── middleware/
│   │   └── middleware.go    # Request logger + panic recoverer
│   └── server/
│       └── server.go        # chi router wiring + graceful shutdown
├── pkg/
│   └── response/
│       └── response.go      # JSON / Error / NoContent helpers
├── .air.toml                # Air hot-reload config
├── .env.example             # Copy to .env and edit
├── go.mod
└── Makefile
```

## Getting started

```bash
# 1. Install dependencies
go mod tidy

# 2. Install air (once)
go install github.com/air-verse/air@latest

# 3. Copy and edit env
cp .env.example .env

# 4. Start with hot reload
make dev

# — or just run directly —
make run
```

## Available make targets

| Target      | Description                              |
|-------------|------------------------------------------|
| `make dev`  | Hot-reload via air                       |
| `make run`  | Build and run without air                |
| `make build`| Compile to `./bin/api`                   |
| `make test` | Run tests with race detector             |
| `make lint` | Run golangci-lint                        |
| `make tidy` | `go mod tidy && go mod verify`           |
| `make clean`| Remove `bin/` and `tmp/`                 |

## Environment variables

| Variable    | Default       | Description          |
|-------------|---------------|----------------------|
| `APP_ENV`   | `development` | Runtime environment  |
| `APP_HOST`  | `0.0.0.0`     | Bind host            |
| `APP_PORT`  | `8080`        | Bind port            |
| `LOG_LEVEL` | `info`        | Zap log level        |

## Adding a new resource

1. Create `internal/handler/thing.go` with a `ThingHandler` struct.
2. Add a `thingRouter()` func in `internal/server/server.go`.
3. Mount it: `r.Mount("/things", thingRouter(log))`.
