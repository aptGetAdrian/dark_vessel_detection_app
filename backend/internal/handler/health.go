package handler

import (
	"net/http"

	"go.uber.org/zap"

	"github.com/yourorg/go-backend/pkg/response"
)

// HealthHandler handles health-check endpoints.
type HealthHandler struct {
	log *zap.Logger
}

// NewHealthHandler constructs a HealthHandler.
func NewHealthHandler(log *zap.Logger) *HealthHandler {
	return &HealthHandler{log: log}
}

// Health godoc
//
//	@Summary     Health check
//	@Description Returns 200 when the service is up
//	@Tags        health
//	@Produce     json
//	@Success     200  {object}  map[string]string
//	@Router      /api/v1/health [get]
func (h *HealthHandler) Health(w http.ResponseWriter, r *http.Request) {
	response.JSON(w, http.StatusOK, map[string]string{
		"status": "ok",
	})
}
