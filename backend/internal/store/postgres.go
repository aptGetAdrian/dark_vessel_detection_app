package store

import (
	"context"
	"fmt"
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
    id           BIGSERIAL PRIMARY KEY,
    lat          DOUBLE PRECISION NOT NULL,
    lon          DOUBLE PRECISION NOT NULL,
    detected_at  TIMESTAMPTZ NOT NULL,
    source       TEXT NOT NULL DEFAULT 'sentinel-1',
    scan_area    TEXT NOT NULL DEFAULT '',
    matched_mmsi BIGINT,
    matched_name TEXT NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Add scan_area column to existing tables (safe to run multiple times)
ALTER TABLE satellite_detections ADD COLUMN IF NOT EXISTS scan_area TEXT NOT NULL DEFAULT '';
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

// PruneOldPositions deletes position records older than 24 hours.
func (s *Store) PruneOldPositions(ctx context.Context) error {
	_, err := s.pool.Exec(ctx,
		`DELETE FROM positions WHERE recorded_at < NOW() - INTERVAL '24 hours'`)
	return err
}

// ── Alerts ────────────────────────────────────────────────────────────────────

// CreateAlertIfNew inserts an alert only if no open alert for that MMSI exists
// within the last 6 hours (prevents duplicate flooding per poll cycle).
func (s *Store) CreateAlertIfNew(ctx context.Context, a model.Alert) error {
	var count int
	err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM alerts
		WHERE mmsi = $1 AND status != 'RESOLVED' AND created_at > NOW() - INTERVAL '6 hours'
	`, a.MMSI).Scan(&count)
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
		INSERT INTO satellite_detections (lat, lon, detected_at, source, scan_area, matched_mmsi, matched_name)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, d.Lat, d.Lon, d.DetectedAt, d.Source, d.ScanArea, d.MatchedMMSI, d.MatchedName)
	return err
}

// GetSatelliteDetections returns detections from the last N hours, optionally filtered by scan area.
func (s *Store) GetSatelliteDetections(ctx context.Context, hours int, area string) ([]model.SatelliteDetection, error) {
	var rows pgx.Rows
	var err error
	if area != "" {
		rows, err = s.pool.Query(ctx, `
			SELECT id, lat, lon, detected_at, source, scan_area, matched_mmsi, matched_name, created_at
			FROM satellite_detections
			WHERE detected_at > NOW() - ($1 * interval '1 hour')
			  AND scan_area = $2
			ORDER BY detected_at DESC
			LIMIT 2000
		`, hours, area)
	} else {
		rows, err = s.pool.Query(ctx, `
			SELECT id, lat, lon, detected_at, source, scan_area, matched_mmsi, matched_name, created_at
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
		SELECT id, lat, lon, detected_at, source, scan_area, matched_mmsi, matched_name, created_at
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
			&d.ScanArea, &d.MatchedMMSI, &d.MatchedName, &d.CreatedAt); err != nil {
			return nil, err
		}
		dets = append(dets, d)
	}
	return dets, rows.Err()
}
