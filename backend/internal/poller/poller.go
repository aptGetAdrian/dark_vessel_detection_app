package poller

import (
	"context"
	"fmt"
	"math"
	"math/rand"
	"time"

	"go.uber.org/zap"

	"github.com/yourorg/go-backend/internal/aishub"
	"github.com/yourorg/go-backend/internal/detection"
	"github.com/yourorg/go-backend/internal/model"
	"github.com/yourorg/go-backend/internal/sentinel"
	"github.com/yourorg/go-backend/internal/store"
)

const crossRefRadiusNM = 5.0 // nautical miles — satellite detection match radius

// Poller periodically fetches AIS data, persists it, runs detection, and (if
// configured) scans Sentinel-1 SAR imagery for vessel detection cross-referencing.
type Poller struct {
	aisClient      *aishub.Client   // nil = AIS Hub disabled
	sentinelClient *sentinel.Client // nil = Sentinel Hub disabled
	store          *store.Store
	aisInterval    time.Duration
	satInterval    time.Duration
	log            *zap.Logger
}

func New(
	aisClient *aishub.Client,
	sentinelClient *sentinel.Client,
	st *store.Store,
	aisInterval, satInterval time.Duration,
	log *zap.Logger,
) *Poller {
	return &Poller{
		aisClient:      aisClient,
		sentinelClient: sentinelClient,
		store:          st,
		aisInterval:    aisInterval,
		satInterval:    satInterval,
		log:            log,
	}
}

// Start runs both poll loops until ctx is cancelled. Intended to run in a goroutine.
func (p *Poller) Start(ctx context.Context) {
	p.log.Info("poller started",
		zap.Duration("ais_interval", p.aisInterval),
		zap.Duration("sat_interval", p.satInterval),
	)

	// Run immediately, then on ticker
	if p.aisClient != nil {
		p.pollAIS(ctx)
	}
	p.pollSatellite(ctx) // runs real or simulated depending on sentinelClient

	aisTicker := time.NewTicker(p.aisInterval)
	satTicker := time.NewTicker(p.satInterval)
	defer aisTicker.Stop()
	defer satTicker.Stop()

	for {
		select {
		case <-ctx.Done():
			p.log.Info("poller stopped")
			return
		case <-aisTicker.C:
			if p.aisClient != nil {
				p.pollAIS(ctx)
			}
		case <-satTicker.C:
			p.pollSatellite(ctx)
		}
	}
}

// ── AIS polling ───────────────────────────────────────────────────────────────

func (p *Poller) pollAIS(ctx context.Context) {
	p.log.Debug("polling AIS Hub")
	rawVessels, err := p.aisClient.FetchEUVessels(ctx)
	if err != nil {
		p.log.Error("AIS Hub fetch failed", zap.Error(err))
		return
	}
	p.log.Info("fetched AIS vessels", zap.Int("count", len(rawVessels)))

	for _, raw := range rawVessels {
		v := model.Vessel{
			MMSI: raw.MMSI, Name: raw.Name, CallSign: raw.CallSign,
			IMO: raw.IMO, Dest: raw.Dest, Lat: raw.Lat, Lon: raw.Lon,
			SOG: raw.SOG, COG: raw.COG, Heading: raw.Heading,
			NavStat: raw.NavStat, Type: raw.Type, Draught: raw.Draught,
			LastAIS: raw.ParsedTime,
		}
		if err := p.store.UpsertVessel(ctx, v); err != nil {
			p.log.Error("upsert vessel", zap.Int64("mmsi", v.MMSI), zap.Error(err))
			continue
		}
		if err := p.store.InsertPosition(ctx, v.MMSI, v.Lat, v.Lon, v.SOG); err != nil {
			p.log.Error("insert position", zap.Int64("mmsi", v.MMSI), zap.Error(err))
		}
		positions, _ := p.store.GetLastPositions(ctx, v.MMSI, 2)
		if result := detection.Analyze(v, positions); result != nil {
			_ = p.store.CreateAlertIfNew(ctx, model.Alert{
				MMSI: v.MMSI, VesselName: v.Name,
				Severity: result.Severity, Reason: result.Reason,
				Confidence: result.Confidence, Lat: v.Lat, Lon: v.Lon,
			})
		}
	}
	_ = p.store.PruneOldPositions(ctx)
}

// ── Satellite scanning ────────────────────────────────────────────────────────

func (p *Poller) pollSatellite(ctx context.Context) {
	// Load current AIS vessels for cross-referencing
	vessels, err := p.store.GetVessels(ctx)
	if err != nil {
		p.log.Error("load vessels for cross-reference", zap.Error(err))
		return
	}

	var detections []model.SatelliteDetection

	if p.sentinelClient != nil {
		detections = p.scanSentinel(ctx)
		if len(detections) == 0 {
			p.log.Warn("Sentinel scan returned 0 detections, using simulated fallback")
			detections = p.simulateDetections(vessels)
		}
	} else {
		detections = p.simulateDetections(vessels)
	}

	p.log.Info("satellite scan complete", zap.Int("detections", len(detections)))

	now := time.Now().UTC()
	for i := range detections {
		detections[i].DetectedAt = now
		nearest := nearestVessel(detections[i].Lat, detections[i].Lon, vessels, crossRefRadiusNM)
		if nearest != nil {
			detections[i].MatchedMMSI = &nearest.MMSI
			detections[i].MatchedName = nearest.Name
		}

		if err := p.store.InsertSatelliteDetection(ctx, detections[i]); err != nil {
			p.log.Error("insert satellite detection", zap.Error(err))
			continue
		}

		// Unmatched detection = vessel physically present but not broadcasting AIS
		if detections[i].MatchedMMSI == nil {
			_ = p.store.CreateAlertIfNew(ctx, model.Alert{
				MMSI:       0,
				VesselName: "Unknown (satellite only)",
				Severity:   model.SeverityWarning,
				Reason:     fmt.Sprintf("Satellite detected vessel at %.4f°N %.4f°E with no AIS broadcast", detections[i].Lat, detections[i].Lon),
				Confidence: 70,
				Lat:        detections[i].Lat,
				Lon:        detections[i].Lon,
			})
		}
	}

	_ = p.store.PruneOldSatelliteDetections(ctx)
}

func (p *Poller) scanSentinel(ctx context.Context) []model.SatelliteDetection {
	var all []model.SatelliteDetection
	for _, area := range model.EUScanAreas {
		pngBytes, err := p.sentinelClient.FetchSARImage(ctx, area)
		if err != nil {
			p.log.Error("fetch SAR image", zap.String("area", area.Name), zap.Error(err))
			continue
		}
		dets, err := sentinel.ExtractDetections(pngBytes, area)
		if err != nil {
			p.log.Error("extract detections", zap.String("area", area.Name), zap.Error(err))
			continue
		}
		for i := range dets {
			dets[i].ScanArea = area.Name
		}
		p.log.Info("SAR detections", zap.String("area", area.Name), zap.Int("count", len(dets)))
		all = append(all, dets...)
	}
	return all
}

// simulateDetections generates realistic satellite detections when Sentinel Hub
// is not configured. For each AIS vessel it adds a detection near their position,
// and for dark vessels it adds a detection at their last known location.
// A few "ghost" detections (no AIS) are added in busy shipping lanes.
func (p *Poller) simulateDetections(vessels []model.Vessel) []model.SatelliteDetection {
	var dets []model.SatelliteDetection

	for _, v := range vessels {
		noise := func() float64 { return (rand.Float64() - 0.5) * 0.02 } // ~1 NM noise
		dets = append(dets, model.SatelliteDetection{
			Lat:    v.Lat + noise(),
			Lon:    v.Lon + noise(),
			Source: "simulated",
		})
	}

	// Ghost detections in busy shipping lanes (no AIS match expected)
	ghosts := []struct{ lat, lon float64 }{
		{50.9, 1.4},  // Dover Strait
		{51.2, 2.9},  // North Sea entry
		{36.0, -5.8}, // Gibraltar
		{43.5, 7.2},  // Ligurian Sea
		{54.8, 10.5}, // Kiel Bight
	}
	for _, g := range ghosts {
		dets = append(dets, model.SatelliteDetection{
			Lat:    g.lat + (rand.Float64()-0.5)*0.05,
			Lon:    g.lon + (rand.Float64()-0.5)*0.05,
			Source: "simulated",
		})
	}
	return dets
}

// ── Geometry ──────────────────────────────────────────────────────────────────

// nearestVessel returns the closest AIS vessel within maxDistNM, or nil.
func nearestVessel(lat, lon float64, vessels []model.Vessel, maxDistNM float64) *model.Vessel {
	var closest *model.Vessel
	min := maxDistNM
	for i := range vessels {
		d := haversineNM(lat, lon, vessels[i].Lat, vessels[i].Lon)
		if d < min {
			min = d
			closest = &vessels[i]
		}
	}
	return closest
}

func haversineNM(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 3440.065
	φ1, φ2 := lat1*math.Pi/180, lat2*math.Pi/180
	Δφ := (lat2 - lat1) * math.Pi / 180
	Δλ := (lon2 - lon1) * math.Pi / 180
	a := math.Sin(Δφ/2)*math.Sin(Δφ/2) + math.Cos(φ1)*math.Cos(φ2)*math.Sin(Δλ/2)*math.Sin(Δλ/2)
	return R * 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
}
