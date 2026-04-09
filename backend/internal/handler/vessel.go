package handler

import (
	"net/http"
	"time"

	"go.uber.org/zap"

	"github.com/yourorg/go-backend/pkg/response"
)

// Vessel represents an AIS-tracked maritime vessel.
type Vessel struct {
	MMSI     string    `json:"mmsi"`
	Name     string    `json:"name"`
	Lat      float64   `json:"lat"`
	Lon      float64   `json:"lon"`
	LastAIS  time.Time `json:"last_ais"`
	IMO      int       `json:"imo"`
	CallSign string    `json:"callsign"`
	Type     int       `json:"type"`
	TypeName string    `json:"type_name"`
	SOG      float64   `json:"sog"`      // Speed Over Ground (knots)
	COG      float64   `json:"cog"`      // Course Over Ground (degrees)
	Heading  int       `json:"heading"`  // True heading (degrees), 511 = not available
	NavStat  int       `json:"navstat"`  // Navigational status (0–15)
	NavStatName string `json:"navstat_name"`
	Dest     string    `json:"dest"`
	Draught  float64   `json:"draught"`  // metres
}

var vesselTypeNames = map[int]string{
	30: "Fishing",
	37: "Pleasure craft",
	52: "Tug",
	70: "Cargo",
	80: "Tanker",
	90: "Other",
}

var navStatNames = map[int]string{
	0:  "Underway",
	1:  "At anchor",
	2:  "Not under command",
	3:  "Restricted manoeuvrability",
	4:  "Constrained by draught",
	5:  "Moored",
	6:  "Aground",
	7:  "Fishing",
	8:  "Sailing",
	15: "Unknown",
}

var mockVessels = func() []Vessel {
	now := time.Now().UTC()
	return []Vessel{
		{
			MMSI: "123456789", Name: "Nordic Star",
			Lat: 55.6761, Lon: 12.5683, LastAIS: now.Add(-1 * time.Hour),
			IMO: 9312345, CallSign: "OXAB2", Type: 70, TypeName: "Cargo",
			SOG: 12.4, COG: 185.0, Heading: 183, NavStat: 0, NavStatName: "Underway",
			Dest: "DEHAM", Draught: 7.2,
		},
		{
			MMSI: "234567890", Name: "Baltic Queen",
			Lat: 57.7089, Lon: 11.9746, LastAIS: now.Add(-30 * time.Minute),
			IMO: 9445621, CallSign: "SEBC9", Type: 70, TypeName: "Cargo",
			SOG: 9.1, COG: 310.0, Heading: 308, NavStat: 0, NavStatName: "Underway",
			Dest: "SEGOT", Draught: 6.8,
		},
		{
			// Anomaly: NavStat=5 (Moored) but SOG > 0
			MMSI: "345678901", Name: "Shadow Mariner",
			Lat: 60.3913, Lon: 5.3221, LastAIS: now.Add(-8 * time.Hour),
			IMO: 9853864, CallSign: "3ETX9", Type: 80, TypeName: "Tanker",
			SOG: 3.2, COG: 122.6, Heading: 119, NavStat: 5, NavStatName: "Moored",
			Dest: "PA BLB", Draught: 8.0,
		},
		{
			// Anomaly: COG vs Heading delta > 30°
			MMSI: "456789012", Name: "Ghost Voyager",
			Lat: 51.9225, Lon: 4.4792, LastAIS: now.Add(-24 * time.Hour),
			IMO: 0, CallSign: "", Type: 80, TypeName: "Tanker",
			SOG: 0.0, COG: 360.0, Heading: 511, NavStat: 1, NavStatName: "At anchor",
			Dest: "", Draught: 5.5,
		},
		{
			MMSI: "567890123", Name: "Arctic Dawn",
			Lat: 63.4305, Lon: 10.3951, LastAIS: now.Add(-2 * time.Hour),
			IMO: 9201847, CallSign: "LMNO4", Type: 52, TypeName: "Tug",
			SOG: 6.3, COG: 045.0, Heading: 46, NavStat: 0, NavStatName: "Underway",
			Dest: "NOBGO", Draught: 4.1,
		},
		{
			// Anomaly: missing IMO + blank callsign on large vessel (Tanker)
			MMSI: "678901234", Name: "Silent Kraken",
			Lat: 48.8566, Lon: 2.3522, LastAIS: now.Add(-48 * time.Hour),
			IMO: 0, CallSign: "", Type: 80, TypeName: "Tanker",
			SOG: 0.0, COG: 360.0, Heading: 511, NavStat: 15, NavStatName: "Unknown",
			Dest: "", Draught: 0.0,
		},
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
