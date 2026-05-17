package model

type ZoneStats struct {
	Name            string  `json:"name"`
	TotalDetections int     `json:"total_detections"`
	MatchedCount    int     `json:"matched_count"`
	UnmatchedCount  int     `json:"unmatched_count"`
	MatchRate       float64 `json:"match_rate"`
	DarkVessels     int     `json:"dark_vessels"`
	AlertCount      int     `json:"alert_count"`
	CriticalAlerts  int     `json:"critical_alerts"`
	AvgRiskScore    float64 `json:"avg_risk_score"`
}

type ZoneDetail struct {
	ZoneStats
	VesselTypeBreakdown    []NameCount          `json:"vessel_type_breakdown"`
	AlertSeverityBreakdown []NameCount          `json:"alert_severity_breakdown"`
	RecentAlerts           []Alert              `json:"recent_alerts"`
	RecentDetections       []SatelliteDetection `json:"recent_detections"`
}

type NameCount struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

type AnalyticsOverview struct {
	TotalDetections  int     `json:"total_detections"`
	OverallMatchRate float64 `json:"overall_match_rate"`
	HighestRiskZone  string  `json:"highest_risk_zone"`
	ZonesCovered     int     `json:"zones_covered"`
	TotalDarkVessels int     `json:"total_dark_vessels"`
	TotalAlerts      int     `json:"total_alerts"`
}
