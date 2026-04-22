package handler

import (
	"net/http"
	"strconv"

	"go.uber.org/zap"

	"github.com/yourorg/go-backend/internal/store"
	"github.com/yourorg/go-backend/pkg/response"
)

// SatelliteHandler serves satellite detection data.
type SatelliteHandler struct {
	log   *zap.Logger
	store *store.Store
}

func NewSatelliteHandler(log *zap.Logger, st *store.Store) *SatelliteHandler {
	return &SatelliteHandler{log: log, store: st}
}

// GetDetections returns satellite detections from the last N hours.
// Query params: ?hours=24 (default 24), ?unmatched=true (only dark vessel candidates)
func (h *SatelliteHandler) GetDetections(w http.ResponseWriter, r *http.Request) {
	if h.store == nil {
		response.JSON(w, http.StatusOK, []struct{}{})
		return
	}

	hours := 24
	if v := r.URL.Query().Get("hours"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 168 {
			hours = n
		}
	}

	if r.URL.Query().Get("unmatched") == "true" {
		dets, err := h.store.GetUnmatchedDetections(r.Context(), hours)
		if err != nil {
			h.log.Error("get unmatched detections", zap.Error(err))
			response.Error(w, http.StatusInternalServerError, "failed to fetch detections")
			return
		}
		response.JSON(w, http.StatusOK, dets)
		return
	}

	dets, err := h.store.GetSatelliteDetections(r.Context(), hours)
	if err != nil {
		h.log.Error("get satellite detections", zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "failed to fetch detections")
		return
	}
	response.JSON(w, http.StatusOK, dets)
}
