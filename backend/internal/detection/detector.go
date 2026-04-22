package detection

import (
	"fmt"
	"math"
	"time"

	"github.com/yourorg/go-backend/internal/model"
)

// Result holds the worst detected anomaly for a vessel.
type Result struct {
	Severity   string
	Reason     string
	Confidence int
}

// Analyze runs all detection signals against a vessel and its recent positions.
// Returns nil if no anomaly is detected.
func Analyze(v model.Vessel, recentPositions []model.Position) *Result {
	var signals []signal

	// 1. AIS silence
	silence := time.Since(v.LastAIS)
	switch {
	case silence > 24*time.Hour:
		signals = append(signals, signal{
			severity:   model.SeverityCritical,
			confidence: 85,
			reason:     fmt.Sprintf("AIS dark for %.0fh — exceeds 24h threshold", silence.Hours()),
		})
	case silence > 6*time.Hour:
		signals = append(signals, signal{
			severity:   model.SeverityWarning,
			confidence: 55,
			reason:     fmt.Sprintf("AIS dark for %.0fh", silence.Hours()),
		})
	}

	// 2. Status-speed mismatch (moored/anchored but moving)
	if (v.NavStat == 1 || v.NavStat == 5) && v.SOG > 0.5 {
		signals = append(signals, signal{
			severity:   model.SeverityWarning,
			confidence: 65,
			reason:     fmt.Sprintf("Reporting %s but moving at %.1f kn", v.NavStatName, v.SOG),
		})
	}

	// 3. Missing identity on commercial vessel (cargo/tanker)
	if v.IMO == 0 && v.CallSign == "" && (v.Type == 70 || v.Type == 80) {
		signals = append(signals, signal{
			severity:   model.SeverityWarning,
			confidence: 50,
			reason:     "No IMO or callsign on commercial vessel",
		})
	}

	// 4. Invalid heading while underway
	if v.Heading == 511 && v.SOG > 1.0 {
		signals = append(signals, signal{
			severity:   model.SeverityInfo,
			confidence: 30,
			reason:     "Invalid heading reported while underway (possible AIS spoofing)",
		})
	}

	// 5. Impossible position jump
	if len(recentPositions) >= 2 {
		implied := impliedSpeedKnots(recentPositions[0], recentPositions[1])
		if implied > 50 {
			signals = append(signals, signal{
				severity:   model.SeverityCritical,
				confidence: 90,
				reason:     fmt.Sprintf("Impossible position jump: %.0f knots implied", implied),
			})
		}
	}

	if len(signals) == 0 {
		return nil
	}

	worst := worstSignal(signals)
	total := 0
	for _, s := range signals {
		total += s.confidence
	}
	if total > 100 {
		total = 100
	}

	return &Result{
		Severity:   worst.severity,
		Reason:     worst.reason,
		Confidence: total,
	}
}

type signal struct {
	severity   string
	confidence int
	reason     string
}

func worstSignal(signals []signal) signal {
	order := map[string]int{
		model.SeverityCritical: 3,
		model.SeverityWarning:  2,
		model.SeverityInfo:     1,
	}
	worst := signals[0]
	for _, s := range signals[1:] {
		if order[s.severity] > order[worst.severity] {
			worst = s
		}
	}
	return worst
}

// impliedSpeedKnots returns the implied speed in knots between two positions.
func impliedSpeedKnots(newer, older model.Position) float64 {
	dt := newer.RecordedAt.Sub(older.RecordedAt).Hours()
	if dt <= 0 {
		return 0
	}
	return haversineNM(newer.Lat, newer.Lon, older.Lat, older.Lon) / dt
}

// haversineNM returns the great-circle distance in nautical miles.
func haversineNM(lat1, lon1, lat2, lon2 float64) float64 {
	const earthRadiusNM = 3440.065
	φ1 := lat1 * math.Pi / 180
	φ2 := lat2 * math.Pi / 180
	Δφ := (lat2 - lat1) * math.Pi / 180
	Δλ := (lon2 - lon1) * math.Pi / 180
	a := math.Sin(Δφ/2)*math.Sin(Δφ/2) +
		math.Cos(φ1)*math.Cos(φ2)*math.Sin(Δλ/2)*math.Sin(Δλ/2)
	return earthRadiusNM * 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
}
