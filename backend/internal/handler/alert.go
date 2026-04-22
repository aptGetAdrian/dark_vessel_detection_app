package handler

import (
	"net/http"
	"strconv"

	"go.uber.org/zap"

	"github.com/yourorg/go-backend/internal/store"
	"github.com/yourorg/go-backend/pkg/response"
)

// AlertHandler handles alert and stats endpoints.
type AlertHandler struct {
	log   *zap.Logger
	store *store.Store
}

func NewAlertHandler(log *zap.Logger, st *store.Store) *AlertHandler {
	return &AlertHandler{log: log, store: st}
}

// GetAlerts returns recent alerts. Accepts ?limit=N (default 50, max 500).
func (h *AlertHandler) GetAlerts(w http.ResponseWriter, r *http.Request) {
	if h.store == nil {
		response.JSON(w, http.StatusOK, []struct{}{})
		return
	}
	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 500 {
			limit = n
		}
	}
	alerts, err := h.store.GetAlerts(r.Context(), limit)
	if err != nil {
		h.log.Error("get alerts", zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "failed to fetch alerts")
		return
	}
	response.JSON(w, http.StatusOK, alerts)
}

// GetStats returns aggregate dashboard statistics.
func (h *AlertHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	if h.store == nil {
		all := mockVessels()
		response.JSON(w, http.StatusOK, map[string]any{
			"total_vessels":   len(all),
			"dark_vessels":    0,
			"active_alerts":   0,
			"critical_alerts": 0,
		})
		return
	}
	stats, err := h.store.GetStats(r.Context())
	if err != nil {
		h.log.Error("get stats", zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "failed to fetch stats")
		return
	}
	response.JSON(w, http.StatusOK, stats)
}
