package handler

import (
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"

	"github.com/yourorg/go-backend/internal/detection"
	"github.com/yourorg/go-backend/internal/model"
	"github.com/yourorg/go-backend/internal/store"
	"github.com/yourorg/go-backend/pkg/response"
)

// VesselHandler handles vessel-related endpoints.
type VesselHandler struct {
	log   *zap.Logger
	store *store.Store // nil → mock data (frontend dev fallback)
}

func NewVesselHandler(log *zap.Logger, st *store.Store) *VesselHandler {
	return &VesselHandler{log: log, store: st}
}

// GetAll returns all tracked vessels.
func (h *VesselHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	if h.store == nil {
		response.JSON(w, http.StatusOK, mockVessels())
		return
	}
	vessels, err := h.store.GetVessels(r.Context())
	if err != nil {
		h.log.Error("get vessels", zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "failed to fetch vessels")
		return
	}
	annotateVessels(vessels)
	response.JSON(w, http.StatusOK, vessels)
}

// GetDark returns vessels whose last AIS signal was more than 6 hours ago.
func (h *VesselHandler) GetDark(w http.ResponseWriter, r *http.Request) {
	if h.store == nil {
		cutoff := time.Now().UTC().Add(-6 * time.Hour)
		dark := make([]model.Vessel, 0)
		for _, v := range mockVessels() {
			if v.LastAIS.Before(cutoff) {
				dark = append(dark, v)
			}
		}
		response.JSON(w, http.StatusOK, dark)
		return
	}
	vessels, err := h.store.GetDarkVessels(r.Context())
	if err != nil {
		h.log.Error("get dark vessels", zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "failed to fetch dark vessels")
		return
	}
	annotateVessels(vessels)
	response.JSON(w, http.StatusOK, vessels)
}

// GetTrack returns position history for a single vessel.
func (h *VesselHandler) GetTrack(w http.ResponseWriter, r *http.Request) {
	mmsiStr := chi.URLParam(r, "mmsi")
	mmsi, err := strconv.ParseInt(mmsiStr, 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid mmsi")
		return
	}

	if h.store == nil {
		response.JSON(w, http.StatusOK, mockTrailForMMSI(mmsi))
		return
	}

	positions, err := h.store.GetLastPositions(r.Context(), mmsi, 20)
	if err != nil {
		h.log.Error("get track", zap.Int64("mmsi", mmsi), zap.Error(err))
		response.Error(w, http.StatusInternalServerError, "failed to fetch track")
		return
	}
	// DB returns newest-first; reverse to chronological for the frontend LineString.
	for i, j := 0, len(positions)-1; i < j; i, j = i+1, j-1 {
		positions[i], positions[j] = positions[j], positions[i]
	}
	response.JSON(w, http.StatusOK, positions)
}

// annotateVessels enriches each vessel with detection-derived confidence, risk score, and anomaly flags.
func annotateVessels(vessels []model.Vessel) {
	for i := range vessels {
		result := detection.Analyze(vessels[i], nil)
		if result == nil {
			continue
		}
		vessels[i].Confidence = result.Confidence
		vessels[i].RiskScore = result.Confidence
		vessels[i].AnomalyFlags = result.Flags
	}
}

func mockTrailForMMSI(mmsi int64) []model.Position {
	var vessel *model.Vessel
	for _, v := range mockVessels() {
		if v.MMSI == mmsi {
			vessel = &v
			break
		}
	}
	if vessel == nil {
		return []model.Position{}
	}

	const steps = 9
	now := time.Now().UTC()

	// Reverse the COG direction to simulate where the vessel came from.
	cogRad := (vessel.COG + 180) * math.Pi / 180
	if vessel.Heading == 511 && vessel.COG == 0 {
		cogRad = 200 * math.Pi / 180
	}

	// ~0.08 degrees per step ≈ 5-9 km depending on latitude.
	stepDist := 0.08
	stepHours := 2.5

	trail := make([]model.Position, steps+1)
	for i := steps; i >= 0; i-- {
		jitter := math.Sin(float64(mmsi%1000)+float64(i)*1.7) * 0.012
		dist := stepDist * float64(steps-i)
		trail[i] = model.Position{
			Lat:        vessel.Lat + math.Cos(cogRad)*dist + jitter,
			Lon:        vessel.Lon + math.Sin(cogRad)*dist - jitter*0.7,
			SOG:        vessel.SOG + math.Sin(float64(i))*1.2,
			RecordedAt: now.Add(-time.Duration(float64(steps-i)*stepHours) * time.Hour),
		}
	}
	// Last point is the vessel's actual current position.
	trail[steps] = model.Position{
		Lat:        vessel.Lat,
		Lon:        vessel.Lon,
		SOG:        vessel.SOG,
		RecordedAt: now,
	}
	return trail
}

func timePtr(t time.Time) *time.Time { return &t }

func mockVessels() []model.Vessel {
	now := time.Now().UTC()
	return []model.Vessel{
		{
			MMSI: 123456789, Name: "Nordic Star", CallSign: "OXAB2",
			IMO: 9312345, Type: 70, TypeName: "Cargo",
			Lat: 55.6761, Lon: 12.5683, LastAIS: now.Add(-1 * time.Hour),
			SOG: 12.4, COG: 185.0, Heading: 183, NavStat: 0, NavStatName: "Underway",
			Dest: "DEHAM", Draught: 7.2,
			PrevLat: 56.15, PrevLon: 12.58, PrevTimestamp: timePtr(now.Add(-4 * time.Hour)),
		},
		{
			MMSI: 234567890, Name: "Baltic Queen", CallSign: "SEBC9",
			IMO: 9445621, Type: 70, TypeName: "Cargo",
			Lat: 57.7089, Lon: 11.9746, LastAIS: now.Add(-30 * time.Minute),
			SOG: 9.1, COG: 310.0, Heading: 308, NavStat: 0, NavStatName: "Underway",
			Dest: "SEGOT", Draught: 6.8,
			PrevLat: 57.59, PrevLon: 12.15, PrevTimestamp: timePtr(now.Add(-2*time.Hour - 30*time.Minute)),
		},
		{
			// Anomaly: moored but moving + 8h dark
			MMSI: 345678901, Name: "Shadow Mariner", CallSign: "3ETX9",
			IMO: 9853864, Type: 80, TypeName: "Tanker",
			Lat: 60.3913, Lon: 5.3221, LastAIS: now.Add(-8 * time.Hour),
			SOG: 3.2, COG: 122.6, Heading: 119, NavStat: 5, NavStatName: "Moored",
			Dest: "PA BLB", Draught: 8.0,
			PrevLat: 60.28, PrevLon: 5.30, PrevTimestamp: timePtr(now.Add(-12 * time.Hour)),
			Confidence: 72, RiskScore: 65,
			AnomalyFlags: []string{"NAVSTAT_MISMATCH", "EXTENDED_SILENCE"},
		},
		{
			// Anomaly: 24h silence, no identity
			MMSI: 456789012, Name: "Ghost Voyager",
			Type: 80, TypeName: "Tanker",
			Lat: 51.9225, Lon: 4.4792, LastAIS: now.Add(-24 * time.Hour),
			Heading: 511, NavStat: 1, NavStatName: "At anchor",
			Draught: 5.5,
			Confidence: 85, RiskScore: 78,
			AnomalyFlags: []string{"EXTENDED_SILENCE", "IDENTITY_INCOMPLETE"},
		},
		{
			MMSI: 567890123, Name: "Arctic Dawn", CallSign: "LMNO4",
			IMO: 9201847, Type: 52, TypeName: "Tug",
			Lat: 63.4305, Lon: 10.3951, LastAIS: now.Add(-2 * time.Hour),
			SOG: 6.3, COG: 45.0, Heading: 46, NavStat: 0, NavStatName: "Underway",
			Dest: "NOBGO", Draught: 4.1,
			PrevLat: 63.35, PrevLon: 10.24, PrevTimestamp: timePtr(now.Add(-4 * time.Hour)),
		},
		{
			// Anomaly: 48h silence, no identity, tanker
			MMSI: 678901234, Name: "Silent Kraken",
			Type: 80, TypeName: "Tanker",
			Lat: 48.8566, Lon: 2.3522, LastAIS: now.Add(-48 * time.Hour),
			Heading: 511, NavStat: 15, NavStatName: "Unknown",
			Confidence: 94, RiskScore: 91,
			AnomalyFlags: []string{"EXTENDED_SILENCE", "IDENTITY_INCOMPLETE", "IMPOSSIBLE_TRAVEL"},
		},
	}
}
