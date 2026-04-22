package model

import "time"

// SatelliteDetection represents a vessel-like object detected in a SAR radar image.
type SatelliteDetection struct {
	ID          int64     `json:"id"`
	Lat         float64   `json:"lat"`
	Lon         float64   `json:"lon"`
	DetectedAt  time.Time `json:"detected_at"`
	Source      string    `json:"source"` // "sentinel-1" or "simulated"
	MatchedMMSI *int64    `json:"matched_mmsi"` // nil = no AIS vessel nearby (dark vessel candidate)
	MatchedName string    `json:"matched_name"`
	CreatedAt   time.Time `json:"created_at"`
}

// ScanArea is a geographic bounding box to scan for vessels.
type ScanArea struct {
	Name           string
	MinLat, MaxLat float64
	MinLon, MaxLon float64
}

// EUScanAreas covers the busiest EU shipping lanes for Sentinel-1 scans.
var EUScanAreas = []ScanArea{
	{"English Channel",       49.5, 51.5, -2.0, 2.0},
	{"North Sea",             52.0, 54.5,  3.0, 7.5},
	{"Strait of Gibraltar",   35.5, 36.5, -6.0, -1.0},
	{"Western Mediterranean", 40.0, 43.0,  2.0, 8.0},
	{"Adriatic Sea",          42.0, 45.5, 13.0, 16.5},
	{"Baltic Approaches",     54.5, 57.5,  9.0, 14.0},
}
