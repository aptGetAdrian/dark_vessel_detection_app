package handler

import (
	"net/http"
	"strconv"
	"time"

	"go.uber.org/zap"

	"github.com/yourorg/go-backend/internal/model"
	"github.com/yourorg/go-backend/internal/store"
	"github.com/yourorg/go-backend/pkg/response"
)

// GetScanAreas returns the list of available scan area names.
func (h *SatelliteHandler) GetScanAreas(w http.ResponseWriter, r *http.Request) {
	names := make([]string, len(model.EUScanAreas))
	for i, a := range model.EUScanAreas {
		names[i] = a.Name
	}
	response.JSON(w, http.StatusOK, names)
}

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
		response.JSON(w, http.StatusOK, mockSatelliteDetections())
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

	area := r.URL.Query().Get("area")
	dets, err := h.store.GetSatelliteDetections(r.Context(), hours, area)
	if err != nil {
		h.log.Error("get satellite detections", zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "failed to fetch detections")
		return
	}
	response.JSON(w, http.StatusOK, dets)
}

func mockSatelliteDetections() []model.SatelliteDetection {
	now := time.Now().UTC()
	mmsi1 := int64(211345670)
	mmsi2 := int64(244876540)
	return []model.SatelliteDetection{
		// Matched detections (AIS-confirmed vessels)
		{ID: 1, Lat: 51.12, Lon: 1.48, DetectedAt: now.Add(-2 * time.Hour), Source: "simulated", MatchedMMSI: &mmsi1, MatchedName: "Nordic Star"},
		{ID: 2, Lat: 53.21, Lon: 4.87, DetectedAt: now.Add(-3 * time.Hour), Source: "simulated", MatchedMMSI: &mmsi2, MatchedName: "Atlantic Carrier"},
		{ID: 3, Lat: 57.43, Lon: 10.21, DetectedAt: now.Add(-1 * time.Hour), Source: "simulated", MatchedMMSI: &mmsi2, MatchedName: "Baltic Express"},
		// Unmatched — dark vessel candidates
		{ID: 4, Lat: 50.93, Lon: 1.42, DetectedAt: now.Add(-4 * time.Hour), Source: "simulated"},
		{ID: 5, Lat: 36.02, Lon: -5.79, DetectedAt: now.Add(-5 * time.Hour), Source: "simulated"},
		{ID: 6, Lat: 54.81, Lon: 10.48, DetectedAt: now.Add(-2 * time.Hour), Source: "simulated"},
		{ID: 7, Lat: 43.51, Lon: 7.23, DetectedAt: now.Add(-6 * time.Hour), Source: "simulated"},
		{ID: 8, Lat: 51.22, Lon: 2.91, DetectedAt: now.Add(-1 * time.Hour), Source: "simulated"},
	}
}
