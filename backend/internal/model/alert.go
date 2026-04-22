package model

import "time"

const (
	SeverityCritical = "CRITICAL"
	SeverityWarning  = "WARNING"
	SeverityInfo     = "INFO"

	StatusNew         = "NEW"
	StatusUnderReview = "UNDER_REVIEW"
	StatusResolved    = "RESOLVED"
)

type Alert struct {
	ID         int64     `json:"id"`
	MMSI       int64     `json:"mmsi"`
	VesselName string    `json:"vessel_name"`
	Severity   string    `json:"severity"`
	Reason     string    `json:"reason"`
	Confidence int       `json:"confidence"`
	Lat        float64   `json:"lat"`
	Lon        float64   `json:"lon"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type Position struct {
	Lat        float64
	Lon        float64
	SOG        float64
	RecordedAt time.Time
}

type Stats struct {
	TotalVessels   int       `json:"total_vessels"`
	DarkVessels    int       `json:"dark_vessels"`
	ActiveAlerts   int       `json:"active_alerts"`
	CriticalAlerts int       `json:"critical_alerts"`
	LastUpdated    time.Time `json:"last_updated"`
}
