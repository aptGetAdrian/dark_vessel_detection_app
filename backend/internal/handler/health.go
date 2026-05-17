package handler

import (
	"net/http"

	"go.uber.org/zap"

	"github.com/yourorg/go-backend/pkg/response"
)

type DataSources struct {
	Database  bool `json:"database"`
	AISStream bool `json:"ais_stream"`
	Sentinel  bool `json:"sentinel"`
}

// HealthHandler handles health-check endpoints.
type HealthHandler struct {
	log     *zap.Logger
	sources DataSources
}

// NewHealthHandler constructs a HealthHandler.
func NewHealthHandler(log *zap.Logger, sources DataSources) *HealthHandler {
	return &HealthHandler{log: log, sources: sources}
}

func (h *HealthHandler) Health(w http.ResponseWriter, r *http.Request) {
	response.JSON(w, http.StatusOK, map[string]any{
		"status":  "ok",
		"sources": h.sources,
	})
}
