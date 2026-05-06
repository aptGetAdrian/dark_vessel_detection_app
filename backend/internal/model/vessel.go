package model

import "time"

type Vessel struct {
	MMSI        int64     `json:"mmsi"`
	Name        string    `json:"name"`
	CallSign    string    `json:"callsign"`
	IMO         int64     `json:"imo"`
	Dest        string    `json:"dest"`
	Lat         float64   `json:"lat"`
	Lon         float64   `json:"lon"`
	SOG         float64   `json:"sog"`
	COG         float64   `json:"cog"`
	Heading     int       `json:"heading"`
	NavStat     int       `json:"nav_stat"`
	NavStatName string    `json:"navstat_name"`
	Type        int       `json:"type"`
	TypeName    string    `json:"type_name"`
	Draught     float64   `json:"draught"`
	LastAIS       time.Time  `json:"last_ais"`
	UpdatedAt     time.Time  `json:"updated_at"`
	PrevLat       float64    `json:"prev_lat,omitempty"`
	PrevLon       float64    `json:"prev_lon,omitempty"`
	PrevTimestamp *time.Time `json:"prev_timestamp,omitempty"`
}

func (v *Vessel) IsDark() bool {
	return time.Since(v.LastAIS) > 6*time.Hour
}
