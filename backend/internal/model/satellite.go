package model

import "time"

// SatelliteDetection represents a vessel-like object detected in a SAR radar image.
type SatelliteDetection struct {
	ID          int64     `json:"id"`
	Lat         float64   `json:"lat"`
	Lon         float64   `json:"lon"`
	DetectedAt  time.Time `json:"detected_at"`
	Source      string    `json:"source"`    // "sentinel-1" or "simulated"
	ScanArea    string    `json:"scan_area"` // e.g. "North Sea"
	MatchedMMSI *int64    `json:"matched_mmsi"`
	MatchedName string    `json:"matched_name"`
	CreatedAt   time.Time `json:"created_at"`
}

// ScanArea is a geographic bounding box to scan for vessels.
type ScanArea struct {
	Name           string
	MinLat, MaxLat float64
	MinLon, MaxLon float64
}

// EUScanAreas covers European shipping lanes. Every bbox is placed over open water —
// deliberately offset from coastlines so SAR land clutter (buildings) is excluded.
var EUScanAreas = []ScanArea{
	// Atlantic / Channel approaches
	{"Celtic Sea",             49.0, 51.5, -11.0,  -6.0},
	{"Bay of Biscay",          44.5, 47.5,  -8.0,  -3.5},
	{"English Channel West",   49.5, 51.0,  -4.5,  -1.0},
	{"English Channel East",   50.5, 51.5,   1.5,   3.5},
	// North Sea — all open water, well clear of UK/NL coasts
	{"Southern North Sea",     52.5, 54.5,   3.5,   7.0},
	{"Central North Sea",      56.0, 58.5,   2.0,   6.0},
	{"Norwegian North Sea",    58.5, 62.0,   2.0,   5.5},
	// Baltic
	{"Kattegat",               56.5, 58.5,  10.0,  13.0},
	{"Baltic Sea",             55.0, 57.5,  14.0,  20.0},
	// Mediterranean
	{"Strait of Gibraltar",    35.5, 36.5,  -6.0,  -1.5},
	{"Western Mediterranean",  38.5, 41.5,   3.0,   8.0},
	{"Ligurian Sea",           42.5, 44.0,   7.5,  10.0},
	{"Tyrrhenian Sea",         39.0, 41.5,  11.0,  14.5},
	{"Ionian Sea",             36.5, 38.5,  16.0,  20.0},
	{"Adriatic Open",          42.0, 44.5,  14.5,  16.5},
	{"Aegean Sea",             37.0, 39.5,  24.0,  27.0},
}
