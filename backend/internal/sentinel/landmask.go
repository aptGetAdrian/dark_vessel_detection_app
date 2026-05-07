package sentinel

import (
	_ "embed"
	"encoding/json"
	"sync"
)

//go:embed data/ne_110m_land.geojson
var landGeoJSON []byte

// rings holds all polygon rings from the land dataset, loaded once at startup.
var (
	landOnce  sync.Once
	landRings [][][2]float64 // each ring is a slice of [lon, lat] pairs
)

func loadLandRings() [][][2]float64 {
	var fc struct {
		Features []struct {
			Geometry struct {
				Type        string          `json:"type"`
				Coordinates json.RawMessage `json:"coordinates"`
			} `json:"geometry"`
		} `json:"features"`
	}
	if err := json.Unmarshal(landGeoJSON, &fc); err != nil {
		return nil
	}

	var rings [][][2]float64
	for _, f := range fc.Features {
		switch f.Geometry.Type {
		case "Polygon":
			var poly [][][2]float64
			if json.Unmarshal(f.Geometry.Coordinates, &poly) == nil {
				rings = append(rings, poly[0]) // exterior ring only
			}
		case "MultiPolygon":
			var multi [][][][2]float64
			if json.Unmarshal(f.Geometry.Coordinates, &multi) == nil {
				for _, poly := range multi {
					rings = append(rings, poly[0])
				}
			}
		}
	}
	return rings
}

// isOnLand returns true if the point (lat, lon) falls inside any land polygon.
// Uses ray casting (even-odd rule) against Natural Earth 110m land polygons.
func isOnLand(lat, lon float64) bool {
	landOnce.Do(func() { landRings = loadLandRings() })

	for _, ring := range landRings {
		if pointInRing(lon, lat, ring) {
			return true
		}
	}
	return false
}

// pointInRing tests whether (x, y) is inside a polygon ring using ray casting.
// Ring coordinates are [lon, lat] = [x, y].
func pointInRing(x, y float64, ring [][2]float64) bool {
	inside := false
	n := len(ring)
	j := n - 1
	for i := 0; i < n; i++ {
		xi, yi := ring[i][0], ring[i][1]
		xj, yj := ring[j][0], ring[j][1]
		if ((yi > y) != (yj > y)) && (x < (xj-xi)*(y-yi)/(yj-yi)+xi) {
			inside = !inside
		}
		j = i
	}
	return inside
}
