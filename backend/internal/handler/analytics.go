package handler

import (
	"net/http"
	"net/url"
	"strconv"
	"time"

	"go.uber.org/zap"

	"github.com/go-chi/chi/v5"
	"github.com/yourorg/go-backend/internal/model"
	"github.com/yourorg/go-backend/internal/store"
	"github.com/yourorg/go-backend/pkg/response"
)

type AnalyticsHandler struct {
	log   *zap.Logger
	store *store.Store
}

func NewAnalyticsHandler(log *zap.Logger, st *store.Store) *AnalyticsHandler {
	return &AnalyticsHandler{log: log, store: st}
}

func (h *AnalyticsHandler) parseHours(r *http.Request) int {
	hours := 48
	if v := r.URL.Query().Get("hours"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 168 {
			hours = n
		}
	}
	return hours
}

func (h *AnalyticsHandler) GetZones(w http.ResponseWriter, r *http.Request) {
	if h.store == nil {
		response.JSON(w, http.StatusOK, mockZoneAnalytics())
		return
	}
	hours := h.parseHours(r)
	zones, err := h.store.GetZoneAnalytics(r.Context(), hours)
	if err != nil {
		h.log.Error("get zone analytics", zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "failed to fetch zone analytics")
		return
	}
	response.JSON(w, http.StatusOK, zones)
}

func (h *AnalyticsHandler) GetZoneDetail(w http.ResponseWriter, r *http.Request) {
	area, err := url.PathUnescape(chi.URLParam(r, "area"))
	if err != nil || area == "" {
		response.Error(w, http.StatusBadRequest, "area parameter required")
		return
	}
	if h.store == nil {
		response.JSON(w, http.StatusOK, mockZoneDetail(area))
		return
	}
	hours := h.parseHours(r)
	detail, err := h.store.GetZoneDetail(r.Context(), area, hours)
	if err != nil {
		h.log.Error("get zone detail", zap.String("area", area), zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "failed to fetch zone detail")
		return
	}
	response.JSON(w, http.StatusOK, detail)
}

func (h *AnalyticsHandler) GetOverview(w http.ResponseWriter, r *http.Request) {
	if h.store == nil {
		response.JSON(w, http.StatusOK, mockAnalyticsOverview())
		return
	}
	hours := h.parseHours(r)
	overview, err := h.store.GetAnalyticsOverview(r.Context(), hours)
	if err != nil {
		h.log.Error("get analytics overview", zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "failed to fetch analytics overview")
		return
	}
	response.JSON(w, http.StatusOK, overview)
}

func mockZoneAnalytics() []model.ZoneStats {
	zones := make([]model.ZoneStats, len(model.EUScanAreas))
	for i, area := range model.EUScanAreas {
		seed := len(area.Name) + i*3
		total := 8 + seed*2
		matched := 5 + seed
		if matched > total {
			matched = total - 1
		}
		zones[i] = model.ZoneStats{
			Name:            area.Name,
			TotalDetections: total,
			MatchedCount:    matched,
			UnmatchedCount:  total - matched,
			MatchRate:       float64(matched) / float64(total),
			DarkVessels:     1 + (seed % 6),
			AlertCount:      2 + (seed % 9),
			CriticalAlerts:  seed % 4,
			AvgRiskScore:    float64(18 + (seed*7)%50),
		}
	}
	return zones
}

func mockZoneDetail(area string) *model.ZoneDetail {
	seed := len(area)
	total := 20 + seed*2
	matched := 12 + seed
	if matched > total {
		matched = total - 2
	}

	now := time.Now().UTC()
	mmsi1 := int64(211345670)

	return &model.ZoneDetail{
		ZoneStats: model.ZoneStats{
			Name:            area,
			TotalDetections: total,
			MatchedCount:    matched,
			UnmatchedCount:  total - matched,
			MatchRate:       float64(matched) / float64(total),
			DarkVessels:     2 + seed%4,
			AlertCount:      5 + seed%6,
			CriticalAlerts:  1 + seed%3,
			AvgRiskScore:    float64(25 + (seed*5)%40),
		},
		VesselTypeBreakdown: []model.NameCount{
			{Name: "Cargo", Count: 5 + seed%3},
			{Name: "Tanker", Count: 4 + seed%2},
			{Name: "Fishing", Count: 2 + seed%3},
			{Name: "Tug", Count: 1 + seed%2},
			{Name: "Other", Count: seed % 3},
		},
		AlertSeverityBreakdown: []model.NameCount{
			{Name: "CRITICAL", Count: 1 + seed%3},
			{Name: "WARNING", Count: 3 + seed%4},
			{Name: "INFO", Count: 1 + seed%2},
		},
		RecentAlerts: []model.Alert{
			{ID: 1, MMSI: 211345670, VesselName: "Nordic Star", Severity: "CRITICAL", Reason: "AIS silent for 26 hours — EXTENDED_SILENCE", Confidence: 22, Lat: 51.12, Lon: 1.48, Status: "NEW", CreatedAt: now.Add(-1 * time.Hour)},
			{ID: 2, MMSI: 244876540, VesselName: "Baltic Express", Severity: "WARNING", Reason: "NavStat reports moored but SOG=3.2kn — NAVSTAT_MISMATCH", Confidence: 61, Lat: 53.21, Lon: 4.87, Status: "NEW", CreatedAt: now.Add(-3 * time.Hour)},
			{ID: 3, MMSI: 311000123, VesselName: "Shadow Runner", Severity: "WARNING", Reason: "Missing IMO + callsign on cargo vessel — MISSING_IDENTITY", Confidence: 55, Lat: 50.93, Lon: 1.42, Status: "NEW", CreatedAt: now.Add(-5 * time.Hour)},
		},
		RecentDetections: []model.SatelliteDetection{
			{ID: 101, Lat: 51.12, Lon: 1.48, DetectedAt: now.Add(-2 * time.Hour), Source: "simulated", ScanArea: area, MatchedMMSI: &mmsi1, MatchedName: "Nordic Star", CreatedAt: now.Add(-2 * time.Hour)},
			{ID: 102, Lat: 50.93, Lon: 1.42, DetectedAt: now.Add(-4 * time.Hour), Source: "simulated", ScanArea: area, CreatedAt: now.Add(-4 * time.Hour)},
			{ID: 103, Lat: 51.05, Lon: 1.55, DetectedAt: now.Add(-6 * time.Hour), Source: "simulated", ScanArea: area, CreatedAt: now.Add(-6 * time.Hour)},
		},
	}
}

func mockAnalyticsOverview() *model.AnalyticsOverview {
	return &model.AnalyticsOverview{
		TotalDetections:  156,
		OverallMatchRate: 0.58,
		HighestRiskZone:  "Strait of Gibraltar",
		ZonesCovered:     14,
		TotalDarkVessels: 11,
		TotalAlerts:      38,
	}
}
