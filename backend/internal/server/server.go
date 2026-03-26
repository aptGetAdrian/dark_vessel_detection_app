package server

import (
	"context"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"go.uber.org/zap"

	"github.com/yourorg/go-backend/internal/config"
	"github.com/yourorg/go-backend/internal/handler"
	"github.com/yourorg/go-backend/internal/middleware"
)

// Server wraps the HTTP server and its dependencies.
type Server struct {
	httpServer *http.Server
	log        *zap.Logger
}

// New constructs a Server with all routes and middleware registered.
func New(cfg *config.Config, log *zap.Logger) *Server {
	r := chi.NewRouter()

	// ── Global middleware ───────────────────────────────────────────────────
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(middleware.Recoverer(log))
	r.Use(middleware.Logger(log))
	r.Use(chimiddleware.Heartbeat("/ping"))

	// ── Routes ─────────────────────────────────────────────────────────────
	r.Mount("/api/v1", v1Router(log))

	return &Server{
		httpServer: &http.Server{
			Addr:    cfg.Addr(),
			Handler: r,
		},
		log: log,
	}
}

// v1Router builds the versioned API sub-router.
func v1Router(log *zap.Logger) chi.Router {
	r := chi.NewRouter()

	healthHandler := handler.NewHealthHandler(log)
	r.Get("/health", healthHandler.Health)

	// Register additional resource routers here, e.g.:
	// r.Mount("/users", userRouter(log))

	return r
}

// Start begins listening and serving HTTP requests.
func (s *Server) Start() error {
	return s.httpServer.ListenAndServe()
}

// Shutdown gracefully drains active connections within the given context deadline.
func (s *Server) Shutdown(ctx context.Context) error {
	return s.httpServer.Shutdown(ctx)
}
