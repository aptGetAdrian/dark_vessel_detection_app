package handler

import (
	"net/http"
	"time"

	"go.uber.org/zap"

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
	response.JSON(w, http.StatusOK, vessels)
}

func mockVessels() []model.Vessel {
	now := time.Now().UTC()
	return []model.Vessel{
		{
			MMSI: 123456789, Name: "Nordic Star", CallSign: "OXAB2",
			IMO: 9312345, Type: 70, TypeName: "Cargo",
			Lat: 55.6761, Lon: 12.5683, LastAIS: now.Add(-1 * time.Hour),
			SOG: 12.4, COG: 185.0, Heading: 183, NavStat: 0, NavStatName: "Underway",
			Dest: "DEHAM", Draught: 7.2,
		},
		{
			MMSI: 234567890, Name: "Baltic Queen", CallSign: "SEBC9",
			IMO: 9445621, Type: 70, TypeName: "Cargo",
			Lat: 57.7089, Lon: 11.9746, LastAIS: now.Add(-30 * time.Minute),
			SOG: 9.1, COG: 310.0, Heading: 308, NavStat: 0, NavStatName: "Underway",
			Dest: "SEGOT", Draught: 6.8,
		},
		{
			// Anomaly: moored but moving
			MMSI: 345678901, Name: "Shadow Mariner", CallSign: "3ETX9",
			IMO: 9853864, Type: 80, TypeName: "Tanker",
			Lat: 60.3913, Lon: 5.3221, LastAIS: now.Add(-8 * time.Hour),
			SOG: 3.2, COG: 122.6, Heading: 119, NavStat: 5, NavStatName: "Moored",
			Dest: "PA BLB", Draught: 8.0,
		},
		{
			// Anomaly: 24h silence, no identity
			MMSI: 456789012, Name: "Ghost Voyager",
			Type: 80, TypeName: "Tanker",
			Lat: 51.9225, Lon: 4.4792, LastAIS: now.Add(-24 * time.Hour),
			Heading: 511, NavStat: 1, NavStatName: "At anchor",
			Draught: 5.5,
		},
		{
			MMSI: 567890123, Name: "Arctic Dawn", CallSign: "LMNO4",
			IMO: 9201847, Type: 52, TypeName: "Tug",
			Lat: 63.4305, Lon: 10.3951, LastAIS: now.Add(-2 * time.Hour),
			SOG: 6.3, COG: 45.0, Heading: 46, NavStat: 0, NavStatName: "Underway",
			Dest: "NOBGO", Draught: 4.1,
		},
		{
			// Anomaly: 48h silence, no identity, tanker
			MMSI: 678901234, Name: "Silent Kraken",
			Type: 80, TypeName: "Tanker",
			Lat: 48.8566, Lon: 2.3522, LastAIS: now.Add(-48 * time.Hour),
			Heading: 511, NavStat: 15, NavStatName: "Unknown",
		},
	}
}
