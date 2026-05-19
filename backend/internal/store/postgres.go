package store

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"

	"github.com/yourorg/go-backend/internal/model"
)

const schema = `
CREATE TABLE IF NOT EXISTS vessels (
    mmsi        BIGINT PRIMARY KEY,
    name        TEXT NOT NULL DEFAULT '',
    callsign    TEXT NOT NULL DEFAULT '',
    imo         BIGINT NOT NULL DEFAULT 0,
    dest        TEXT NOT NULL DEFAULT '',
    lat         DOUBLE PRECISION NOT NULL,
    lon         DOUBLE PRECISION NOT NULL,
    sog         DOUBLE PRECISION NOT NULL DEFAULT 0,
    cog         DOUBLE PRECISION NOT NULL DEFAULT 0,
    heading     INTEGER NOT NULL DEFAULT 511,
    nav_stat    INTEGER NOT NULL DEFAULT 15,
    vessel_type INTEGER NOT NULL DEFAULT 0,
    draught     DOUBLE PRECISION NOT NULL DEFAULT 0,
    last_ais    TIMESTAMPTZ NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS positions (
    id          BIGSERIAL PRIMARY KEY,
    mmsi        BIGINT NOT NULL,
    lat         DOUBLE PRECISION NOT NULL,
    lon         DOUBLE PRECISION NOT NULL,
    sog         DOUBLE PRECISION NOT NULL DEFAULT 0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_positions_mmsi_time ON positions (mmsi, recorded_at DESC);

CREATE TABLE IF NOT EXISTS alerts (
    id          BIGSERIAL PRIMARY KEY,
    mmsi        BIGINT NOT NULL,
    vessel_name TEXT NOT NULL DEFAULT '',
    severity    TEXT NOT NULL,
    reason      TEXT NOT NULL,
    confidence  INTEGER NOT NULL,
    lat         DOUBLE PRECISION NOT NULL,
    lon         DOUBLE PRECISION NOT NULL,
    status      TEXT NOT NULL DEFAULT 'NEW',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alerts_mmsi ON alerts (mmsi);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts (status);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts (created_at DESC);

CREATE TABLE IF NOT EXISTS satellite_detections (
    id                BIGSERIAL PRIMARY KEY,
    lat               DOUBLE PRECISION NOT NULL,
    lon               DOUBLE PRECISION NOT NULL,
    detected_at       TIMESTAMPTZ NOT NULL,
    source            TEXT NOT NULL DEFAULT 'sentinel-1',
    scan_area         TEXT NOT NULL DEFAULT '',
    matched_mmsi      BIGINT,
    matched_name      TEXT NOT NULL DEFAULT '',
    match_distance_nm DOUBLE PRECISION,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Add columns to existing tables (safe to run multiple times)
ALTER TABLE satellite_detections ADD COLUMN IF NOT EXISTS scan_area TEXT NOT NULL DEFAULT '';
ALTER TABLE satellite_detections ADD COLUMN IF NOT EXISTS match_distance_nm DOUBLE PRECISION;
CREATE INDEX IF NOT EXISTS idx_sat_detected_at ON satellite_detections (detected_at DESC);
`

// Store wraps a PostgreSQL connection pool.
type Store struct {
	pool *pgxpool.Pool
	log  *zap.Logger
}

// New connects to the database and runs schema migrations.
func New(ctx context.Context, databaseURL string, log *zap.Logger) (*Store, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("connecting to database: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("pinging database: %w", err)
	}
	s := &Store{pool: pool, log: log}
	if _, err := pool.Exec(ctx, schema); err != nil {
		pool.Close()
		return nil, fmt.Errorf("running schema: %w", err)
	}
	return s, nil
}

func (s *Store) Close() { s.pool.Close() }

// ── Vessels ───────────────────────────────────────────────────────────────────

func (s *Store) UpsertVessel(ctx context.Context, v model.Vessel) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO vessels
		    (mmsi, name, callsign, imo, dest, lat, lon, sog, cog, heading, nav_stat, vessel_type, draught, last_ais, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
		ON CONFLICT (mmsi) DO UPDATE SET
		    name        = EXCLUDED.name,
		    callsign    = EXCLUDED.callsign,
		    imo         = EXCLUDED.imo,
		    dest        = EXCLUDED.dest,
		    lat         = EXCLUDED.lat,
		    lon         = EXCLUDED.lon,
		    sog         = EXCLUDED.sog,
		    cog         = EXCLUDED.cog,
		    heading     = EXCLUDED.heading,
		    nav_stat    = EXCLUDED.nav_stat,
		    vessel_type = EXCLUDED.vessel_type,
		    draught     = EXCLUDED.draught,
		    last_ais    = EXCLUDED.last_ais,
		    updated_at  = NOW()
	`, v.MMSI, v.Name, v.CallSign, v.IMO, v.Dest,
		v.Lat, v.Lon, v.SOG, v.COG, v.Heading,
		v.NavStat, v.Type, v.Draught, v.LastAIS)
	return err
}

func (s *Store) GetVessels(ctx context.Context) ([]model.Vessel, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT mmsi, name, callsign, imo, dest, lat, lon, sog, cog, heading,
		       nav_stat, vessel_type, draught, last_ais, updated_at
		FROM vessels ORDER BY updated_at DESC LIMIT 500
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanVessels(rows)
}

// GetAllVessels returns every tracked vessel without a row limit.
// Used by the satellite cross-referencing path where we need full coverage.
func (s *Store) GetAllVessels(ctx context.Context) ([]model.Vessel, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT mmsi, name, callsign, imo, dest, lat, lon, sog, cog, heading,
		       nav_stat, vessel_type, draught, last_ais, updated_at
		FROM vessels ORDER BY updated_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanVessels(rows)
}

func (s *Store) GetDarkVessels(ctx context.Context) ([]model.Vessel, error) {
	cutoff := time.Now().UTC().Add(-6 * time.Hour)
	rows, err := s.pool.Query(ctx, `
		SELECT mmsi, name, callsign, imo, dest, lat, lon, sog, cog, heading,
		       nav_stat, vessel_type, draught, last_ais, updated_at
		FROM vessels WHERE last_ais < $1 ORDER BY last_ais ASC LIMIT 200
	`, cutoff)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanVessels(rows)
}

func (s *Store) GetVesselByMMSI(ctx context.Context, mmsi int64) (*model.Vessel, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT mmsi, name, callsign, imo, dest, lat, lon, sog, cog, heading,
		       nav_stat, vessel_type, draught, last_ais, updated_at
		FROM vessels WHERE mmsi = $1
	`, mmsi)
	var v model.Vessel
	err := row.Scan(&v.MMSI, &v.Name, &v.CallSign, &v.IMO, &v.Dest,
		&v.Lat, &v.Lon, &v.SOG, &v.COG, &v.Heading,
		&v.NavStat, &v.Type, &v.Draught, &v.LastAIS, &v.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	v.NavStatName = navStatName(v.NavStat)
	v.TypeName = vesselTypeName(v.Type)
	return &v, nil
}

// ── Positions ─────────────────────────────────────────────────────────────────

func (s *Store) InsertPosition(ctx context.Context, mmsi int64, lat, lon, sog float64) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO positions (mmsi, lat, lon, sog) VALUES ($1,$2,$3,$4)`,
		mmsi, lat, lon, sog)
	return err
}

func (s *Store) GetLastPositions(ctx context.Context, mmsi int64, n int) ([]model.Position, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT lat, lon, sog, recorded_at FROM positions
		WHERE mmsi = $1 ORDER BY recorded_at DESC LIMIT $2
	`, mmsi, n)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var positions []model.Position
	for rows.Next() {
		var p model.Position
		if err := rows.Scan(&p.Lat, &p.Lon, &p.SOG, &p.RecordedAt); err != nil {
			return nil, err
		}
		positions = append(positions, p)
	}
	return positions, rows.Err()
}

// PruneOldPositions deletes position records older than 72 hours.
func (s *Store) PruneOldPositions(ctx context.Context) error {
	_, err := s.pool.Exec(ctx,
		`DELETE FROM positions WHERE recorded_at < NOW() - INTERVAL '72 hours'`)
	return err
}

// ── Alerts ────────────────────────────────────────────────────────────────────

// CreateAlertIfNew inserts an alert only if no similar open alert exists within
// the last 6 hours. For known vessels (MMSI > 0) it deduplicates by MMSI.
// For unmatched satellite detections (MMSI = 0) it deduplicates by geographic
// proximity (~5 NM) so each distinct unmatched location gets its own alert.
func (s *Store) CreateAlertIfNew(ctx context.Context, a model.Alert) error {
	var count int
	var err error
	if a.MMSI != 0 {
		err = s.pool.QueryRow(ctx, `
			SELECT COUNT(*) FROM alerts
			WHERE mmsi = $1 AND status != 'RESOLVED' AND created_at > NOW() - INTERVAL '6 hours'
		`, a.MMSI).Scan(&count)
	} else {
		err = s.pool.QueryRow(ctx, `
			SELECT COUNT(*) FROM alerts
			WHERE mmsi = 0 AND status != 'RESOLVED' AND created_at > NOW() - INTERVAL '6 hours'
			  AND ABS(lat - $1) < 0.083 AND ABS(lon - $2) < 0.083
		`, a.Lat, a.Lon).Scan(&count)
	}
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	_, err = s.pool.Exec(ctx, `
		INSERT INTO alerts (mmsi, vessel_name, severity, reason, confidence, lat, lon)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
	`, a.MMSI, a.VesselName, a.Severity, a.Reason, a.Confidence, a.Lat, a.Lon)
	return err
}

func (s *Store) GetAlerts(ctx context.Context, limit int) ([]model.Alert, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, mmsi, vessel_name, severity, reason, confidence, lat, lon,
		       status, created_at, updated_at
		FROM alerts ORDER BY created_at DESC LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var alerts []model.Alert
	for rows.Next() {
		var a model.Alert
		if err := rows.Scan(&a.ID, &a.MMSI, &a.VesselName, &a.Severity, &a.Reason,
			&a.Confidence, &a.Lat, &a.Lon, &a.Status, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		a.VesselName = strings.TrimSpace(a.VesselName)
		alerts = append(alerts, a)
	}
	return alerts, rows.Err()
}

// ── Stats ─────────────────────────────────────────────────────────────────────

func (s *Store) GetStats(ctx context.Context) (model.Stats, error) {
	var stats model.Stats
	err := s.pool.QueryRow(ctx, `
		SELECT
		    COUNT(*)                                                  AS total,
		    COUNT(*) FILTER (WHERE last_ais < NOW() - INTERVAL '6 hours') AS dark,
		    COALESCE(MAX(updated_at), NOW())                          AS last_updated
		FROM vessels
	`).Scan(&stats.TotalVessels, &stats.DarkVessels, &stats.LastUpdated)
	if err != nil {
		return stats, err
	}
	err = s.pool.QueryRow(ctx, `
		SELECT
		    COUNT(*) FILTER (WHERE status != 'RESOLVED')                          AS active,
		    COUNT(*) FILTER (WHERE status != 'RESOLVED' AND severity = 'CRITICAL') AS critical
		FROM alerts
	`).Scan(&stats.ActiveAlerts, &stats.CriticalAlerts)
	return stats, err
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func scanVessels(rows pgx.Rows) ([]model.Vessel, error) {
	var vessels []model.Vessel
	for rows.Next() {
		var v model.Vessel
		if err := rows.Scan(&v.MMSI, &v.Name, &v.CallSign, &v.IMO, &v.Dest,
			&v.Lat, &v.Lon, &v.SOG, &v.COG, &v.Heading,
			&v.NavStat, &v.Type, &v.Draught, &v.LastAIS, &v.UpdatedAt); err != nil {
			return nil, err
		}
		v.Name = strings.TrimSpace(v.Name)
		v.CallSign = strings.TrimSpace(v.CallSign)
		v.Dest = strings.TrimSpace(v.Dest)
		v.NavStatName = navStatName(v.NavStat)
		v.TypeName = vesselTypeName(v.Type)
		vessels = append(vessels, v)
	}
	return vessels, rows.Err()
}

func navStatName(s int) string {
	names := map[int]string{
		0: "Underway", 1: "At anchor", 2: "Not under command",
		3: "Restricted manoeuvrability", 4: "Constrained by draught",
		5: "Moored", 6: "Aground", 7: "Fishing", 8: "Sailing", 15: "Unknown",
	}
	if n, ok := names[s]; ok {
		return n
	}
	return "Unknown"
}

func vesselTypeName(t int) string {
	names := map[int]string{
		30: "Fishing", 37: "Pleasure craft", 52: "Tug",
		70: "Cargo", 80: "Tanker", 90: "Other",
	}
	if n, ok := names[t]; ok {
		return n
	}
	return "Other"
}

// ── Satellite detections ──────────────────────────────────────────────────────

func (s *Store) InsertSatelliteDetection(ctx context.Context, d model.SatelliteDetection) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO satellite_detections (lat, lon, detected_at, source, scan_area, matched_mmsi, matched_name, match_distance_nm)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, d.Lat, d.Lon, d.DetectedAt, d.Source, d.ScanArea, d.MatchedMMSI, d.MatchedName, d.MatchDistanceNM)
	return err
}

// GetSatelliteDetections returns detections from the last N hours, optionally filtered by scan area.
func (s *Store) GetSatelliteDetections(ctx context.Context, hours int, area string) ([]model.SatelliteDetection, error) {
	var rows pgx.Rows
	var err error
	if area != "" {
		rows, err = s.pool.Query(ctx, `
			SELECT id, lat, lon, detected_at, source, scan_area, matched_mmsi, matched_name, match_distance_nm, created_at
			FROM satellite_detections
			WHERE detected_at > NOW() - ($1 * interval '1 hour')
			  AND scan_area = $2
			ORDER BY detected_at DESC
			LIMIT 2000
		`, hours, area)
	} else {
		rows, err = s.pool.Query(ctx, `
			SELECT id, lat, lon, detected_at, source, scan_area, matched_mmsi, matched_name, match_distance_nm, created_at
			FROM satellite_detections
			WHERE detected_at > NOW() - ($1 * interval '1 hour')
			ORDER BY detected_at DESC
			LIMIT 2000
		`, hours)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanSatDetections(rows)
}

// GetUnmatchedDetections returns satellite detections with no AIS match from the last N hours.
func (s *Store) GetUnmatchedDetections(ctx context.Context, hours int) ([]model.SatelliteDetection, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, lat, lon, detected_at, source, scan_area, matched_mmsi, matched_name, match_distance_nm, created_at
		FROM satellite_detections
		WHERE matched_mmsi IS NULL
		  AND detected_at > NOW() - ($1 * interval '1 hour')
		ORDER BY detected_at DESC
		LIMIT 500
	`, hours)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanSatDetections(rows)
}

// PruneOldSatelliteDetections removes detections older than 48 hours.
func (s *Store) PruneOldSatelliteDetections(ctx context.Context) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM satellite_detections WHERE detected_at < NOW() - INTERVAL '48 hours'`)
	return err
}

func scanSatDetections(rows pgx.Rows) ([]model.SatelliteDetection, error) {
	var dets []model.SatelliteDetection
	for rows.Next() {
		var d model.SatelliteDetection
		if err := rows.Scan(&d.ID, &d.Lat, &d.Lon, &d.DetectedAt, &d.Source,
			&d.ScanArea, &d.MatchedMMSI, &d.MatchedName, &d.MatchDistanceNM, &d.CreatedAt); err != nil {
			return nil, err
		}
		dets = append(dets, d)
	}
	return dets, rows.Err()
}

// ── Analytics ────────────────────────────────────────────────────────────────

func (s *Store) GetZoneAnalytics(ctx context.Context, hours int) ([]model.ZoneStats, error) {
	rows, err := s.pool.Query(ctx, `
		WITH det AS (
			SELECT scan_area,
			       COUNT(*)                                            AS total,
			       COUNT(*) FILTER (WHERE matched_mmsi IS NOT NULL)    AS matched,
			       COUNT(*) FILTER (WHERE matched_mmsi IS NULL)        AS unmatched
			FROM satellite_detections
			WHERE detected_at > NOW() - ($1 * interval '1 hour')
			  AND scan_area != ''
			GROUP BY scan_area
		),
		dark AS (
			SELECT sd.scan_area, COUNT(DISTINCT v.mmsi) AS cnt
			FROM satellite_detections sd
			JOIN vessels v ON v.mmsi = sd.matched_mmsi
			WHERE sd.detected_at > NOW() - ($1 * interval '1 hour')
			  AND v.last_ais < NOW() - INTERVAL '6 hours'
			  AND sd.scan_area != ''
			GROUP BY sd.scan_area
		),
		alrt AS (
			SELECT sd.scan_area,
			       COUNT(*)                                         AS total,
			       COUNT(*) FILTER (WHERE a.severity = 'CRITICAL')  AS critical
			FROM alerts a
			JOIN satellite_detections sd ON sd.matched_mmsi = a.mmsi
			WHERE a.created_at > NOW() - ($1 * interval '1 hour')
			  AND sd.scan_area != ''
			GROUP BY sd.scan_area
		),
		risk AS (
			SELECT sd.scan_area, AVG(CASE
				WHEN v.last_ais < NOW() - INTERVAL '24 hours' THEN 85
				WHEN v.last_ais < NOW() - INTERVAL '6 hours'  THEN 60
				ELSE 20
			END) AS avg_risk
			FROM satellite_detections sd
			JOIN vessels v ON v.mmsi = sd.matched_mmsi
			WHERE sd.detected_at > NOW() - ($1 * interval '1 hour')
			  AND sd.scan_area != ''
			GROUP BY sd.scan_area
		)
		SELECT d.scan_area,
		       d.total,
		       d.matched,
		       d.unmatched,
		       CASE WHEN d.total > 0 THEN d.matched::float / d.total ELSE 0 END,
		       COALESCE(dk.cnt, 0),
		       COALESCE(al.total, 0),
		       COALESCE(al.critical, 0),
		       COALESCE(r.avg_risk, 0)
		FROM det d
		LEFT JOIN dark dk ON dk.scan_area = d.scan_area
		LEFT JOIN alrt al ON al.scan_area = d.scan_area
		LEFT JOIN risk r  ON r.scan_area = d.scan_area
		ORDER BY d.total DESC
	`, hours)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var zones []model.ZoneStats
	for rows.Next() {
		var z model.ZoneStats
		if err := rows.Scan(&z.Name, &z.TotalDetections, &z.MatchedCount,
			&z.UnmatchedCount, &z.MatchRate, &z.DarkVessels,
			&z.AlertCount, &z.CriticalAlerts, &z.AvgRiskScore); err != nil {
			return nil, err
		}
		zones = append(zones, z)
	}
	return zones, rows.Err()
}

func (s *Store) GetZoneDetail(ctx context.Context, area string, hours int) (*model.ZoneDetail, error) {
	var z model.ZoneStats
	z.Name = area
	err := s.pool.QueryRow(ctx, `
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE matched_mmsi IS NOT NULL),
			COUNT(*) FILTER (WHERE matched_mmsi IS NULL)
		FROM satellite_detections
		WHERE scan_area = $1 AND detected_at > NOW() - ($2 * interval '1 hour')
	`, area, hours).Scan(&z.TotalDetections, &z.MatchedCount, &z.UnmatchedCount)
	if err != nil {
		return nil, err
	}
	if z.TotalDetections > 0 {
		z.MatchRate = float64(z.MatchedCount) / float64(z.TotalDetections)
	}

	// Dark vessels in zone
	_ = s.pool.QueryRow(ctx, `
		SELECT COUNT(DISTINCT v.mmsi)
		FROM satellite_detections sd
		JOIN vessels v ON v.mmsi = sd.matched_mmsi
		WHERE sd.scan_area = $1
		  AND sd.detected_at > NOW() - ($2 * interval '1 hour')
		  AND v.last_ais < NOW() - INTERVAL '6 hours'
	`, area, hours).Scan(&z.DarkVessels)

	// Alerts in zone
	_ = s.pool.QueryRow(ctx, `
		SELECT COUNT(*), COUNT(*) FILTER (WHERE a.severity = 'CRITICAL')
		FROM alerts a
		JOIN satellite_detections sd ON sd.matched_mmsi = a.mmsi
		WHERE sd.scan_area = $1 AND a.created_at > NOW() - ($2 * interval '1 hour')
	`, area, hours).Scan(&z.AlertCount, &z.CriticalAlerts)

	// Avg risk
	_ = s.pool.QueryRow(ctx, `
		SELECT COALESCE(AVG(CASE
			WHEN v.last_ais < NOW() - INTERVAL '24 hours' THEN 85
			WHEN v.last_ais < NOW() - INTERVAL '6 hours'  THEN 60
			ELSE 20
		END), 0)
		FROM satellite_detections sd
		JOIN vessels v ON v.mmsi = sd.matched_mmsi
		WHERE sd.scan_area = $1 AND sd.detected_at > NOW() - ($2 * interval '1 hour')
	`, area, hours).Scan(&z.AvgRiskScore)

	detail := &model.ZoneDetail{ZoneStats: z}

	// Vessel type breakdown
	typeRows, err := s.pool.Query(ctx, `
		SELECT COALESCE(NULLIF(v.vessel_type, 0), 90), COUNT(DISTINCT v.mmsi)
		FROM satellite_detections sd
		JOIN vessels v ON v.mmsi = sd.matched_mmsi
		WHERE sd.scan_area = $1 AND sd.detected_at > NOW() - ($2 * interval '1 hour')
		GROUP BY 1 ORDER BY 2 DESC LIMIT 8
	`, area, hours)
	if err == nil {
		defer typeRows.Close()
		for typeRows.Next() {
			var vt, cnt int
			if err := typeRows.Scan(&vt, &cnt); err == nil {
				detail.VesselTypeBreakdown = append(detail.VesselTypeBreakdown,
					model.NameCount{Name: vesselTypeName(vt), Count: cnt})
			}
		}
	}

	// Alert severity breakdown
	sevRows, err := s.pool.Query(ctx, `
		SELECT a.severity, COUNT(*)
		FROM alerts a
		JOIN satellite_detections sd ON sd.matched_mmsi = a.mmsi
		WHERE sd.scan_area = $1 AND a.created_at > NOW() - ($2 * interval '1 hour')
		GROUP BY a.severity
	`, area, hours)
	if err == nil {
		defer sevRows.Close()
		for sevRows.Next() {
			var nc model.NameCount
			if err := sevRows.Scan(&nc.Name, &nc.Count); err == nil {
				detail.AlertSeverityBreakdown = append(detail.AlertSeverityBreakdown, nc)
			}
		}
	}

	// Recent alerts
	alertRows, err := s.pool.Query(ctx, `
		SELECT a.id, a.mmsi, a.vessel_name, a.severity, a.reason, a.confidence,
		       a.lat, a.lon, a.status, a.created_at, a.updated_at
		FROM alerts a
		JOIN satellite_detections sd ON sd.matched_mmsi = a.mmsi
		WHERE sd.scan_area = $1
		ORDER BY a.created_at DESC LIMIT 10
	`, area)
	if err == nil {
		defer alertRows.Close()
		for alertRows.Next() {
			var a model.Alert
			if err := alertRows.Scan(&a.ID, &a.MMSI, &a.VesselName, &a.Severity, &a.Reason,
				&a.Confidence, &a.Lat, &a.Lon, &a.Status, &a.CreatedAt, &a.UpdatedAt); err == nil {
				detail.RecentAlerts = append(detail.RecentAlerts, a)
			}
		}
	}

	// Recent detections
	detRows, err := s.pool.Query(ctx, `
		SELECT id, lat, lon, detected_at, source, scan_area, matched_mmsi, matched_name, match_distance_nm, created_at
		FROM satellite_detections
		WHERE scan_area = $1 ORDER BY detected_at DESC LIMIT 10
	`, area)
	if err == nil {
		defer detRows.Close()
		dets, _ := scanSatDetections(detRows)
		detail.RecentDetections = dets
	}

	return detail, nil
}

func (s *Store) GetAnalyticsOverview(ctx context.Context, hours int) (*model.AnalyticsOverview, error) {
	var o model.AnalyticsOverview
	var matchedCount int
	err := s.pool.QueryRow(ctx, `
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE matched_mmsi IS NOT NULL),
			COUNT(DISTINCT scan_area) FILTER (WHERE scan_area != '')
		FROM satellite_detections
		WHERE detected_at > NOW() - ($1 * interval '1 hour')
	`, hours).Scan(&o.TotalDetections, &matchedCount, &o.ZonesCovered)
	if err != nil {
		return nil, err
	}
	if o.TotalDetections > 0 {
		o.OverallMatchRate = float64(matchedCount) / float64(o.TotalDetections)
	}

	_ = s.pool.QueryRow(ctx, `
		SELECT COALESCE(sd.scan_area, 'Unknown')
		FROM satellite_detections sd
		JOIN vessels v ON v.mmsi = sd.matched_mmsi
		WHERE sd.detected_at > NOW() - ($1 * interval '1 hour')
		  AND v.last_ais < NOW() - INTERVAL '6 hours'
		  AND sd.scan_area != ''
		GROUP BY sd.scan_area
		ORDER BY COUNT(*) DESC LIMIT 1
	`, hours).Scan(&o.HighestRiskZone)

	_ = s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM vessels WHERE last_ais < NOW() - INTERVAL '6 hours'
	`).Scan(&o.TotalDarkVessels)

	_ = s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM alerts
		WHERE status != 'RESOLVED' AND created_at > NOW() - ($1 * interval '1 hour')
	`, hours).Scan(&o.TotalAlerts)

	return &o, nil
}
