package handler

import (
	"net/http"
	"time"

	"go.uber.org/zap"

	"github.com/yourorg/go-backend/pkg/response"
)

// Vessel represents an AIS-tracked maritime vessel.
type Vessel struct {
	MMSI    string    `json:"mmsi"`
	Name    string    `json:"name"`
	Lat     float64   `json:"lat"`
	Lon     float64   `json:"lon"`
	LastAIS time.Time `json:"last_ais"`
}

var mockVessels = func() []Vessel {
	now := time.Now().UTC()
	return []Vessel{
		{MMSI: "123456789", Name: "Nordic Star", Lat: 55.6761, Lon: 12.5683, LastAIS: now.Add(-1 * time.Hour)},
		{MMSI: "234567890", Name: "Baltic Queen", Lat: 57.7089, Lon: 11.9746, LastAIS: now.Add(-30 * time.Minute)},
		{MMSI: "345678901", Name: "Shadow Mariner", Lat: 60.3913, Lon: 5.3221, LastAIS: now.Add(-8 * time.Hour)},
		{MMSI: "456789012", Name: "Ghost Voyager", Lat: 51.9225, Lon: 4.4792, LastAIS: now.Add(-24 * time.Hour)},
		{MMSI: "567890123", Name: "Arctic Dawn", Lat: 63.4305, Lon: 10.3951, LastAIS: now.Add(-2 * time.Hour)},
		{MMSI: "678901234", Name: "Silent Kraken", Lat: 48.8566, Lon: 2.3522, LastAIS: now.Add(-48 * time.Hour)},
	}
}()

const darkThreshold = 6 * time.Hour

// VesselHandler handles vessel-related endpoints.
type VesselHandler struct {
	log *zap.Logger
}

// NewVesselHandler constructs a VesselHandler.
func NewVesselHandler(log *zap.Logger) *VesselHandler {
	return &VesselHandler{log: log}
}

// GetAll returns all tracked vessels.
func (h *VesselHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	response.JSON(w, http.StatusOK, mockVessels)
}

// GetDark returns vessels whose last AIS signal was more than 6 hours ago.
func (h *VesselHandler) GetDark(w http.ResponseWriter, r *http.Request) {
	cutoff := time.Now().UTC().Add(-darkThreshold)
	dark := make([]Vessel, 0)
	for _, v := range mockVessels {
		if v.LastAIS.Before(cutoff) {
			dark = append(dark, v)
		}
	}
	response.JSON(w, http.StatusOK, dark)
}
