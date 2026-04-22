package sentinel

import (
	"bytes"
	"image"
	"image/png"
	"math"

	"github.com/yourorg/go-backend/internal/model"
)

const (
	// shipThreshold: grayscale pixel value above which a pixel is a ship candidate.
	// With the evalscript mapping [-25dB,+5dB]→[0,255]:
	//   -5 dB (typical ship) → ~170   ocean (-20 dB) → ~42
	shipThreshold = uint8(170)

	minClusterPixels = 2   // below = speckle noise
	maxClusterPixels = 300 // above = coastline / land clutter
)

// ExtractDetections parses a SAR PNG image and returns the geographic coordinates
// of each detected vessel-like bright spot.
func ExtractDetections(pngBytes []byte, area model.ScanArea) ([]model.SatelliteDetection, error) {
	img, err := png.Decode(bytes.NewReader(pngBytes))
	if err != nil {
		return nil, err
	}

	gray := toGray(img)
	clusters := findClusters(gray)
	bounds := gray.Bounds()

	detections := make([]model.SatelliteDetection, 0, len(clusters))
	for _, c := range clusters {
		cx, cy := clusterCenter(c)
		lat, lon := pixelToLatLon(cx, cy, bounds, area)
		detections = append(detections, model.SatelliteDetection{
			Lat:    lat,
			Lon:    lon,
			Source: "sentinel-1",
		})
	}
	return detections, nil
}

// toGray converts any image to *image.Gray.
func toGray(src image.Image) *image.Gray {
	if g, ok := src.(*image.Gray); ok {
		return g
	}
	b := src.Bounds()
	g := image.NewGray(b)
	for y := b.Min.Y; y < b.Max.Y; y++ {
		for x := b.Min.X; x < b.Max.X; x++ {
			g.Set(x, y, src.At(x, y))
		}
	}
	return g
}

// findClusters finds connected components of pixels above shipThreshold.
func findClusters(img *image.Gray) [][]image.Point {
	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	visited := make([]bool, w*h)
	var clusters [][]image.Point

	idx := func(x, y int) int { return y*w + x }

	for y := b.Min.Y; y < b.Max.Y; y++ {
		for x := b.Min.X; x < b.Max.X; x++ {
			i := idx(x-b.Min.X, y-b.Min.Y)
			if visited[i] || img.GrayAt(x, y).Y < shipThreshold {
				visited[i] = true
				continue
			}
			// BFS flood fill
			queue := []image.Point{{x, y}}
			visited[i] = true
			var pixels []image.Point
			for len(queue) > 0 {
				p := queue[0]
				queue = queue[1:]
				pixels = append(pixels, p)
				for _, d := range [4][2]int{{0, 1}, {0, -1}, {1, 0}, {-1, 0}} {
					nx, ny := p.X+d[0], p.Y+d[1]
					if nx < b.Min.X || nx >= b.Max.X || ny < b.Min.Y || ny >= b.Max.Y {
						continue
					}
					ni := idx(nx-b.Min.X, ny-b.Min.Y)
					if visited[ni] {
						continue
					}
					visited[ni] = true
					if img.GrayAt(nx, ny).Y >= shipThreshold {
						queue = append(queue, image.Point{nx, ny})
					}
				}
			}
			if len(pixels) >= minClusterPixels && len(pixels) <= maxClusterPixels {
				clusters = append(clusters, pixels)
			}
		}
	}
	return clusters
}

func clusterCenter(pixels []image.Point) (float64, float64) {
	var sumX, sumY float64
	for _, p := range pixels {
		sumX += float64(p.X)
		sumY += float64(p.Y)
	}
	n := float64(len(pixels))
	return sumX / n, sumY / n
}

// pixelToLatLon converts pixel coordinates to geographic coordinates using
// bilinear interpolation over the bounding box.
func pixelToLatLon(px, py float64, bounds image.Rectangle, area model.ScanArea) (lat, lon float64) {
	w := float64(bounds.Dx())
	h := float64(bounds.Dy())
	lon = area.MinLon + (px-float64(bounds.Min.X))/w*(area.MaxLon-area.MinLon)
	// PNG y=0 is top = MaxLat
	lat = area.MaxLat - (py-float64(bounds.Min.Y))/h*(area.MaxLat-area.MinLat)
	return math.Round(lat*10000)/10000, math.Round(lon*10000)/10000
}
