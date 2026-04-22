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
	"github.com/yourorg/go-backend/internal/store"
)

// Server wraps the HTTP server and its dependencies.
type Server struct {
	httpServer *http.Server
	log        *zap.Logger
}

// New constructs a Server with all routes and middleware registered.
// st may be nil, in which case handlers fall back to mock data.
func New(cfg *config.Config, log *zap.Logger, st *store.Store) *Server {
	r := chi.NewRouter()

	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(middleware.CORS)
	r.Use(middleware.Recoverer(log))
	r.Use(middleware.Logger(log))
	r.Use(chimiddleware.Heartbeat("/ping"))

	r.Mount("/api/v1", v1Router(log, st))

	return &Server{
		httpServer: &http.Server{Addr: cfg.Addr(), Handler: r},
		log:        log,
	}
}

func v1Router(log *zap.Logger, st *store.Store) chi.Router {
	r := chi.NewRouter()

	r.Get("/health", handler.NewHealthHandler(log).Health)

	vessels := handler.NewVesselHandler(log, st)
	r.Get("/vessels", vessels.GetAll)
	r.Get("/vessels/dark", vessels.GetDark)

	alerts := handler.NewAlertHandler(log, st)
	r.Get("/alerts", alerts.GetAlerts)
	r.Get("/stats", alerts.GetStats)

	sat := handler.NewSatelliteHandler(log, st)
	r.Get("/satellite/detections", sat.GetDetections)

	return r
}

func (s *Server) Start() error {
	return s.httpServer.ListenAndServe()
}

func (s *Server) Shutdown(ctx context.Context) error {
	return s.httpServer.Shutdown(ctx)
}
