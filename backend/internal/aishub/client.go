package aishub

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// EU waters bounding box
const (
	euLatMin = 30.0
	euLatMax = 72.0
	euLonMin = -20.0
	euLonMax = 45.0
)

const baseURL = "https://data.aishub.net/ws.php"

type Client struct {
	username   string
	httpClient *http.Client
}

func NewClient(username string) *Client {
	return &Client{
		username:   username,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

// Vessel is the raw AIS Hub response shape.
type Vessel struct {
	MMSI       int64   `json:"MMSI"`
	RawTime    string  `json:"TIME"`
	Lat        float64 `json:"LATITUDE"`
	Lon        float64 `json:"LONGITUDE"`
	SOG        float64 `json:"SOG"`
	COG        float64 `json:"COG"`
	Heading    int     `json:"HEADING"`
	NavStat    int     `json:"NAVSTAT"`
	IMO        int64   `json:"IMO"`
	Name       string  `json:"NAME"`
	CallSign   string  `json:"CALLSIGN"`
	Type       int     `json:"TYPE"`
	Draught    float64 `json:"DRAUGHT"`
	Dest       string  `json:"DEST"`
	ParsedTime time.Time
}

// FetchEUVessels returns all AIS-broadcasting vessels in European waters.
func (c *Client) FetchEUVessels(ctx context.Context) ([]Vessel, error) {
	url := fmt.Sprintf(
		"%s?username=%s&format=1&output=json&compress=0&latmin=%.0f&latmax=%.0f&lonmin=%.0f&lonmax=%.0f",
		baseURL, c.username, euLatMin, euLatMax, euLonMin, euLonMax,
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("building request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	// Response: [{ERROR:false}, {vessel1}, {vessel2}, ...]
	var raw []json.RawMessage
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}
	if len(raw) == 0 {
		return nil, fmt.Errorf("empty response from AIS Hub")
	}

	var status struct {
		Error   bool   `json:"ERROR"`
		Message string `json:"MESSAGE"`
	}
	if err := json.Unmarshal(raw[0], &status); err != nil {
		return nil, fmt.Errorf("decoding status: %w", err)
	}
	if status.Error {
		return nil, fmt.Errorf("AIS Hub: %s", status.Message)
	}

	vessels := make([]Vessel, 0, len(raw)-1)
	for _, item := range raw[1:] {
		var v Vessel
		if err := json.Unmarshal(item, &v); err != nil {
			continue
		}
		v.ParsedTime = parseAISTime(v.RawTime)
		vessels = append(vessels, v)
	}
	return vessels, nil
}

// parseAISTime parses AIS Hub's "2006-01-02 15:04:05" UTC format.
func parseAISTime(s string) time.Time {
	t, err := time.Parse("2006-01-02 15:04:05", s)
	if err != nil {
		return time.Now().UTC()
	}
	return t.UTC()
}
