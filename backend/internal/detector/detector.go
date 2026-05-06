package detector

import (
	"math"
	"time"
)

const (
	darkThresholdHours        = 6.0
	navstatMooredMovingThresh = 0.3
	cogHeadingDeltaThresh     = 30.0
	speedToleranceFactor      = 1.15
)

type AnomalyFlag string

const (
	FlagImpossibleTravel   AnomalyFlag = "IMPOSSIBLE_TRAVEL"
	FlagIdentityIncomplete AnomalyFlag = "IDENTITY_INCOMPLETE"
	FlagNavstatMismatch    AnomalyFlag = "NAVSTAT_MISMATCH"
	FlagCOGHeadingDelta    AnomalyFlag = "COG_HEADING_DELTA"
	FlagExtendedSilence    AnomalyFlag = "EXTENDED_SILENCE"
)

type VesselInput struct {
	MMSI          string
	CallSign      string
	Type          int
	IMO           int
	NavStat       int
	Heading       int
	SOG           float64
	COG           float64
	Lat           float64
	Lon           float64
	PrevLat       float64
	PrevLon       float64
	LastAIS       time.Time
	PrevTimestamp time.Time
}

type DetectionResult struct {
	Confidence   int
	RiskScore    int
	AnomalyFlags []AnomalyFlag
	IsDark       bool
}

func maxSpeedForType(vesselType int) float64 {
	if vesselType >= 70 && vesselType <= 79 {
		return 15.0
	}
	if vesselType >= 80 && vesselType <= 89 {
		return 14.0
	}
	if vesselType == 52 {
		return 10.0
	}
	return 25.0
}

func isCommercialType(vesselType int) bool {
	return (vesselType >= 70 && vesselType <= 89)
}

func checkImpossibleTravel(v VesselInput) (bool, float64, float64) {
	if v.PrevTimestamp.IsZero() {
		return false, 0, 0
	}
	elapsedH := v.LastAIS.Sub(v.PrevTimestamp).Hours()
	if elapsedH <= 0 {
		return false, 0, 0
	}
	distNM := HaversineNM(v.PrevLat, v.PrevLon, v.Lat, v.Lon)
	impliedSpeed := distNM / elapsedH
	maxSpeed := maxSpeedForType(v.Type)
	return impliedSpeed > maxSpeed*speedToleranceFactor, impliedSpeed, maxSpeed
}

func checkIdentityIncomplete(v VesselInput) bool {
	return v.IMO == 0 && v.CallSign == "" && isCommercialType(v.Type)
}

func checkNavstatMismatch(v VesselInput) bool {
	return (v.NavStat == 5 || v.NavStat == 1) && v.SOG > navstatMooredMovingThresh
}

func checkCOGHeadingDelta(v VesselInput) bool {
	if v.Heading == 511 || v.COG == 360.0 {
		return false
	}
	delta := math.Abs(v.COG - float64(v.Heading))
	if delta > 180 {
		delta = 360 - delta
	}
	return delta > cogHeadingDeltaThresh
}

func checkExtendedSilence(v VesselInput, now time.Time) (bool, float64) {
	silenceH := now.Sub(v.LastAIS).Hours()
	return silenceH > darkThresholdHours, silenceH
}

func calcConfidence(flags []AnomalyFlag, silenceH float64, commercial bool) int {
	score := 100
	for _, f := range flags {
		switch f {
		case FlagExtendedSilence:
			switch {
			case silenceH > 48:
				score -= 45
			case silenceH > 12:
				score -= 30
			default:
				score -= 15
			}
		case FlagIdentityIncomplete:
			if commercial {
				score -= 20
			} else {
				score -= 10
			}
		case FlagNavstatMismatch:
			score -= 15
		case FlagImpossibleTravel:
			score -= 25
		case FlagCOGHeadingDelta:
			score -= 10
		}
	}
	if score < 0 {
		return 0
	}
	return score
}

func calcRiskScore(flags []AnomalyFlag, silenceH, impliedSpeed, maxSpeed float64, commercial bool) int {
	score := 0
	for _, f := range flags {
		switch f {
		case FlagExtendedSilence:
			switch {
			case silenceH > 48:
				score += 40
			case silenceH > 12:
				score += 25
			default:
				score += 10
			}
		case FlagIdentityIncomplete:
			if commercial {
				score += 20
			} else {
				score += 8
			}
		case FlagNavstatMismatch:
			score += 15
		case FlagImpossibleTravel:
			bonus := 0
			if maxSpeed > 0 {
				bonus = int((impliedSpeed/maxSpeed - 1) * 10)
				if bonus > 10 {
					bonus = 10
				}
			}
			score += 30 + bonus
		case FlagCOGHeadingDelta:
			score += 10
		}
	}
	if score > 100 {
		return 100
	}
	return score
}

// Analyse runs all anomaly checks and returns a DetectionResult for the given vessel.
func Analyse(v VesselInput, now time.Time) DetectionResult {
	var flags []AnomalyFlag

	isDark, silenceH := checkExtendedSilence(v, now)
	if isDark {
		flags = append(flags, FlagExtendedSilence)
	}

	if checkIdentityIncomplete(v) {
		flags = append(flags, FlagIdentityIncomplete)
	}

	if checkNavstatMismatch(v) {
		flags = append(flags, FlagNavstatMismatch)
	}

	if checkCOGHeadingDelta(v) {
		flags = append(flags, FlagCOGHeadingDelta)
	}

	impossible, impliedSpeed, maxSpeed := checkImpossibleTravel(v)
	if impossible {
		flags = append(flags, FlagImpossibleTravel)
	}

	if flags == nil {
		flags = []AnomalyFlag{}
	}

	commercial := isCommercialType(v.Type)
	confidence := calcConfidence(flags, silenceH, commercial)
	riskScore := calcRiskScore(flags, silenceH, impliedSpeed, maxSpeed, commercial)

	return DetectionResult{
		Confidence:   confidence,
		RiskScore:    riskScore,
		AnomalyFlags: flags,
		IsDark:       isDark,
	}
}
