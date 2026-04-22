// Package sentinel integrates with the Copernicus Data Space Ecosystem
// Sentinel Hub Processing API to fetch Sentinel-1 SAR imagery for ship detection.
//
// API docs: https://documentation.dataspace.copernicus.eu/APIs/SentinelHub
//
// The evalscript embedded below runs server-side (JavaScript) on Sentinel-1 GRD
// data and converts the VV polarisation band to an 8-bit grayscale PNG.
// Ships appear as bright spots (high radar backscatter) against a dark ocean.
package sentinel

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/yourorg/go-backend/internal/model"
)

const (
	tokenURL   = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
	processURL = "https://sh.dataspace.copernicus.eu/api/v1/process"

	// evalscript: converts Sentinel-1 GRD VV band to 8-bit grayscale.
	// Maps [-25 dB, +5 dB] → [0, 255]. Ships at -5 to 0 dB → ~170-212.
	evalscript = `//VERSION=3
function setup() {
  return {
    input:  [{bands: ["VV"]}],
    output: {bands: 1, sampleType: SampleType.UINT8}
  };
}
function evaluatePixel(s) {
  var db = 10 * Math.log10(Math.max(s.VV, 0.0001));
  return [Math.round(Math.max(0, Math.min(255, (db + 25) / 30 * 255)))];
}`
)

// Client authenticates with Sentinel Hub and fetches processed SAR imagery.
type Client struct {
	clientID     string
	clientSecret string
	http         *http.Client

	mu          sync.Mutex
	cachedToken string
	tokenExpiry time.Time
}

func NewClient(clientID, clientSecret string) *Client {
	return &Client{
		clientID:     clientID,
		clientSecret: clientSecret,
		http:         &http.Client{Timeout: 60 * time.Second},
	}
}

// FetchSARImage requests a 512×512 grayscale PNG of Sentinel-1 SAR data for the
// given bounding box and time window. Returns raw PNG bytes.
func (c *Client) FetchSARImage(ctx context.Context, area model.ScanArea) ([]byte, error) {
	token, err := c.getToken(ctx)
	if err != nil {
		return nil, fmt.Errorf("auth: %w", err)
	}

	// Time range: last 4 days (Sentinel-1 revisit over EU ≈ 1-3 days)
	to := time.Now().UTC()
	from := to.Add(-96 * time.Hour)

	body := map[string]any{
		"input": map[string]any{
			"bounds": map[string]any{
				"bbox": []float64{area.MinLon, area.MinLat, area.MaxLon, area.MaxLat},
				"properties": map[string]string{
					"crs": "http://www.opengis.net/def/crs/EPSG/0/4326",
				},
			},
			"data": []map[string]any{{
				"type": "sentinel-1-grd",
				"dataFilter": map[string]any{
					"timeRange": map[string]string{
						"from": from.Format(time.RFC3339),
						"to":   to.Format(time.RFC3339),
					},
					"acquisitionMode": "IW",
					"polarization":    "DV",
					"resolution":      "HIGH",
				},
				"processing": map[string]any{
					"orthorectify":       true,
					"backCoeff":          "GAMMA0_TERRAIN",
					"speckleFilter":      map[string]any{"isEnabled": true, "windowSizeX": 5, "windowSizeY": 5},
				},
			}},
		},
		"output": map[string]any{
			"width":  512,
			"height": 512,
			"responses": []map[string]any{{
				"identifier": "default",
				"format":     map[string]string{"type": "image/png"},
			}},
		},
		"evalscript": evalscript,
	}

	payload, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, processURL, bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("process request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("sentinel hub HTTP %d: %s", resp.StatusCode, string(body))
	}

	return io.ReadAll(resp.Body)
}

// getToken returns a cached OAuth2 bearer token, refreshing if expired.
func (c *Client) getToken(ctx context.Context) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.cachedToken != "" && time.Now().Before(c.tokenExpiry) {
		return c.cachedToken, nil
	}

	form := url.Values{}
	form.Set("grant_type", "client_credentials")
	form.Set("client_id", c.clientID)
	form.Set("client_secret", c.clientSecret)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, tokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("token request: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
		Error       string `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("decoding token: %w", err)
	}
	if result.Error != "" {
		return "", fmt.Errorf("token error: %s", result.Error)
	}

	c.cachedToken = result.AccessToken
	c.tokenExpiry = time.Now().Add(time.Duration(result.ExpiresIn-30) * time.Second)
	return c.cachedToken, nil
}
