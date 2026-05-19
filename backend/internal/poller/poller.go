package poller

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"time"

	"go.uber.org/zap"

	"github.com/yourorg/go-backend/internal/aisstream"
	"github.com/yourorg/go-backend/internal/detection"
	"github.com/yourorg/go-backend/internal/model"
	"github.com/yourorg/go-backend/internal/sentinel"
	"github.com/yourorg/go-backend/internal/store"
)

const crossRefRadiusNM = 15.0 // nautical miles — satellite detection match radius

// Poller streams AIS data in real-time, persists it, runs detection, and (if
// configured) scans Sentinel-1 SAR imagery for vessel detection cross-referencing.
type Poller struct {
	aisClient      *aisstream.Client // nil = AIS streaming disabled
	sentinelClient *sentinel.Client  // nil = Sentinel Hub disabled
	store          *store.Store
	satInterval    time.Duration
	log            *zap.Logger
}

func New(
	aisClient *aisstream.Client,
	sentinelClient *sentinel.Client,
	st *store.Store,
	satInterval time.Duration,
	log *zap.Logger,
) *Poller {
	return &Poller{
		aisClient:      aisClient,
		sentinelClient: sentinelClient,
		store:          st,
		satInterval:    satInterval,
		log:            log,
	}
}

// Start runs the AIS stream consumer and satellite poll loop until ctx is cancelled.
func (p *Poller) Start(ctx context.Context) {
	p.log.Info("poller started", zap.Duration("sat_interval", p.satInterval))

	p.pollSatellite(ctx)

	satTicker := time.NewTicker(p.satInterval)
	pruneTicker := time.NewTicker(time.Hour)
	defer satTicker.Stop()
	defer pruneTicker.Stop()

	if p.aisClient != nil {
		go p.streamAIS(ctx)
	}

	for {
		select {
		case <-ctx.Done():
			p.log.Info("poller stopped")
			return
		case <-satTicker.C:
			p.pollSatellite(ctx)
		case <-pruneTicker.C:
			_ = p.store.PruneOldPositions(ctx)
		}
	}
}

// ── AIS streaming ─────────────────────────────────────────────────────────────

func (p *Poller) streamAIS(ctx context.Context) {
	// In-memory cache merges PositionReport + ShipStaticData before upserting.
	vessels := make(map[int64]model.Vessel)

	msgCh := p.aisClient.Stream(ctx)
	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-msgCh:
			if !ok {
				return
			}
			switch msg.MessageType {
			case "PositionReport":
				p.handlePosition(ctx, msg, vessels)
			case "ShipStaticData":
				p.handleStatic(ctx, msg, vessels)
			}
		}
	}
}

func (p *Poller) handlePosition(ctx context.Context, msg aisstream.AISMessage, vessels map[int64]model.Vessel) {
	var inner struct {
		PositionReport aisstream.PositionReport `json:"PositionReport"`
	}
	if err := json.Unmarshal(msg.Message, &inner); err != nil {
		return
	}
	pr := inner.PositionReport
	mmsi := msg.Metadata.MMSI
	if mmsi == 0 {
		mmsi = pr.UserID
	}
	if mmsi == 0 {
		return
	}

	v := vessels[mmsi]
	v.MMSI = mmsi
	if msg.Metadata.ShipName != "" {
		v.Name = msg.Metadata.ShipName
	}
	v.Lat = pr.Latitude
	v.Lon = pr.Longitude
	v.SOG = pr.Sog
	v.COG = pr.Cog
	v.Heading = pr.TrueHeading
	v.NavStat = pr.NavigationalStatus
	v.LastAIS = time.Now().UTC()
	vessels[mmsi] = v

	if err := p.store.UpsertVessel(ctx, v); err != nil {
		p.log.Error("upsert vessel", zap.Int64("mmsi", mmsi), zap.Error(err))
		return
	}
	if err := p.store.InsertPosition(ctx, mmsi, v.Lat, v.Lon, v.SOG); err != nil {
		p.log.Error("insert position", zap.Int64("mmsi", mmsi), zap.Error(err))
	}

	positions, _ := p.store.GetLastPositions(ctx, mmsi, 2)
	if result := detection.Analyze(v, positions); result != nil {
		_ = p.store.CreateAlertIfNew(ctx, model.Alert{
			MMSI: mmsi, VesselName: v.Name,
			Severity: result.Severity, Reason: result.Reason,
			Confidence: result.Confidence, Lat: v.Lat, Lon: v.Lon,
		})
	}
}

func (p *Poller) handleStatic(ctx context.Context, msg aisstream.AISMessage, vessels map[int64]model.Vessel) {
	var inner struct {
		ShipStaticData aisstream.ShipStaticData `json:"ShipStaticData"`
	}
	if err := json.Unmarshal(msg.Message, &inner); err != nil {
		return
	}
	sd := inner.ShipStaticData
	mmsi := msg.Metadata.MMSI
	if mmsi == 0 {
		mmsi = sd.UserID
	}
	if mmsi == 0 {
		return
	}

	v := vessels[mmsi]
	v.MMSI = mmsi
	if sd.Name != "" {
		v.Name = sd.Name
	}
	v.CallSign = sd.CallSign
	v.IMO = sd.ImoNumber
	v.Type = sd.Type
	v.Draught = sd.MaximumStaticDraught
	v.Dest = sd.Destination
	vessels[mmsi] = v

	// Only persist if we already have a position (LastAIS set); otherwise
	// we'd upsert a vessel with zero lat/lon which is misleading.
	if v.LastAIS.IsZero() {
		return
	}
	if err := p.store.UpsertVessel(ctx, v); err != nil {
		p.log.Error("upsert vessel (static)", zap.Int64("mmsi", mmsi), zap.Error(err))
	}
}

// ── Satellite scanning ────────────────────────────────────────────────────────

func (p *Poller) pollSatellite(ctx context.Context) {
	vessels, err := p.store.GetAllVessels(ctx)
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
		nearest, distNM := nearestVessel(detections[i].Lat, detections[i].Lon, vessels, crossRefRadiusNM)
		if nearest != nil {
			detections[i].MatchedMMSI = &nearest.MMSI
			detections[i].MatchedName = nearest.Name
			detections[i].MatchDistanceNM = &distNM
		}

		if err := p.store.InsertSatelliteDetection(ctx, detections[i]); err != nil {
			p.log.Error("insert satellite detection", zap.Error(err))
			continue
		}

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
		lat := v.Lat + noise()
		lon := v.Lon + noise()
		dets = append(dets, model.SatelliteDetection{
			Lat:      lat,
			Lon:      lon,
			Source:   "simulated",
			ScanArea: scanAreaForPoint(lat, lon),
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
		lat := g.lat + (rand.Float64()-0.5)*0.05
		lon := g.lon + (rand.Float64()-0.5)*0.05
		dets = append(dets, model.SatelliteDetection{
			Lat:      lat,
			Lon:      lon,
			Source:   "simulated",
			ScanArea: scanAreaForPoint(lat, lon),
		})
	}
	return dets
}

func scanAreaForPoint(lat, lon float64) string {
	for _, a := range model.EUScanAreas {
		if lat >= a.MinLat && lat <= a.MaxLat && lon >= a.MinLon && lon <= a.MaxLon {
			return a.Name
		}
	}
	return ""
}

// ── Geometry ──────────────────────────────────────────────────────────────────

// nearestVessel returns the closest AIS vessel within maxDistNM and the distance, or nil.
func nearestVessel(lat, lon float64, vessels []model.Vessel, maxDistNM float64) (*model.Vessel, float64) {
	var closest *model.Vessel
	min := maxDistNM
	for i := range vessels {
		d := haversineNM(lat, lon, vessels[i].Lat, vessels[i].Lon)
		if d < min {
			min = d
			closest = &vessels[i]
		}
	}
	return closest, min
}

func haversineNM(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 3440.065
	φ1, φ2 := lat1*math.Pi/180, lat2*math.Pi/180
	Δφ := (lat2 - lat1) * math.Pi / 180
	Δλ := (lon2 - lon1) * math.Pi / 180
	a := math.Sin(Δφ/2)*math.Sin(Δφ/2) + math.Cos(φ1)*math.Cos(φ2)*math.Sin(Δλ/2)*math.Sin(Δλ/2)
	return R * 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
}
