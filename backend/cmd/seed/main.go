// cmd/seed populates the database with realistic EU vessel data for demo purposes.
// Run with: make seed
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:secret@localhost:5432/darkvessel"
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("ping: %v", err)
	}

	if err := runSchema(ctx, pool); err != nil {
		log.Fatalf("schema: %v", err)
	}

	if err := seedVessels(ctx, pool); err != nil {
		log.Fatalf("seed vessels: %v", err)
	}

	if err := seedAlerts(ctx, pool); err != nil {
		log.Fatalf("seed alerts: %v", err)
	}

	if err := seedSatelliteDetections(ctx, pool); err != nil {
		log.Fatalf("seed satellite detections: %v", err)
	}

	fmt.Println("✓ Seeded", len(vessels), "vessels, alerts, and satellite detections")
}

// ── Schema (mirrors store/postgres.go) ───────────────────────────────────────

func runSchema(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, `
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
		    source       TEXT NOT NULL DEFAULT 'simulated',
		    matched_mmsi BIGINT,
		    matched_name TEXT NOT NULL DEFAULT '',
		    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_sat_detected_at ON satellite_detections (detected_at DESC);
	`)
	return err
}

// ── Vessel data ───────────────────────────────────────────────────────────────

type vessel struct {
	mmsi     int64
	name     string
	callsign string
	imo      int64
	dest     string
	lat, lon float64
	sog, cog float64
	heading  int
	navStat  int
	vType    int
	draught  float64
	lastAIS  time.Time // zero = now (broadcasting)
}

var now = time.Now().UTC()

var vessels = []vessel{
	// ── Normal broadcasting vessels ──────────────────────────────────────────
	{211345670, "Nordic Pioneer", "DKAB3", 9312001, "DEHAM", 55.6761, 12.5683, 12.4, 185.0, 183, 0, 70, 7.2, now.Add(-45 * time.Minute)},
	{257123450, "Fjord Carrier", "LMFJ9", 9445201, "NOBGO", 60.3913, 5.3221, 9.1, 310.0, 308, 0, 70, 6.8, now.Add(-20 * time.Minute)},
	{244876540, "Rotterdam Star", "PHRS4", 9312445, "NLRTM", 51.9225, 4.4792, 7.3, 095.0, 93, 0, 70, 8.1, now.Add(-10 * time.Minute)},
	{232456780, "North Sea Pioneer", "GBNS7", 9445890, "GBFXT", 53.3838, 3.5564, 11.2, 270.0, 268, 0, 70, 6.3, now.Add(-55 * time.Minute)},
	{227345670, "Bretagne Express", "FZBR2", 9201556, "FRLEH", 47.2814, -2.5136, 14.5, 320.0, 318, 0, 70, 9.2, now.Add(-30 * time.Minute)},
	{239567890, "Aegean Horizon", "SXAH6", 9853401, "GRPIR", 37.9384, 23.6462, 10.8, 140.0, 138, 0, 80, 10.5, now.Add(-15 * time.Minute)},
	{247234560, "Adriatic Star", "ITAS3", 9312887, "ITVCE", 45.4408, 12.3155, 8.6, 055.0, 53, 0, 70, 7.8, now.Add(-40 * time.Minute)},
	{265789010, "Baltic Queen", "SEBC9", 9445621, "SEGOT", 57.7089, 11.9746, 9.1, 310.0, 308, 0, 70, 6.8, now.Add(-25 * time.Minute)},
	{219456780, "Copenhagen Trader", "OYCT5", 9201847, "DKCPH", 55.6500, 12.6000, 6.2, 080.0, 78, 0, 52, 4.1, now.Add(-50 * time.Minute)},
	{224567890, "Iberian Carrier", "EAIC8", 9312334, "ESVLC", 39.4699, -0.3763, 13.1, 195.0, 193, 0, 70, 8.9, now.Add(-35 * time.Minute)},
	{263123450, "Tagus Bridge", "CSTB2", 9445712, "PTLEI", 38.7223, -9.1393, 11.7, 260.0, 258, 0, 70, 7.5, now.Add(-45 * time.Minute)},
	{244123450, "Maas Sentinel", "PHMS6", 9853221, "NLAMS", 52.3676, 4.9041, 5.8, 120.0, 118, 1, 80, 12.3, now.Add(-5 * time.Minute)},
	{257890120, "Arctic Dawn", "LMNO4", 9201847, "NOBGO", 63.4305, 10.3951, 6.3, 045.0, 46, 0, 52, 4.1, now.Add(-1 * time.Hour)},
	{211567890, "Elbe Mariner", "DKEM4", 9445334, "DEBRM", 53.5753, 10.0153, 7.9, 200.0, 198, 0, 70, 6.5, now.Add(-20 * time.Minute)},
	{232789010, "Thames Trader", "GBTT8", 9312556, "GBLON", 51.5074, -0.1278, 10.4, 085.0, 83, 0, 70, 7.1, now.Add(-35 * time.Minute)},
	{247890120, "Tyrrhenian Star", "ITTS9", 9853112, "ITGOA", 44.4056, 8.9463, 9.8, 230.0, 228, 0, 80, 11.2, now.Add(-50 * time.Minute)},
	{239123450, "Ionian Breeze", "SXIB3", 9201334, "GRHER", 37.4399, 24.9300, 8.3, 175.0, 173, 0, 30, 3.5, now.Add(-15 * time.Minute)},
	{227890120, "Loire Express", "FZLE7", 9312778, "FRNTS", 47.2173, -1.5534, 12.6, 280.0, 278, 0, 70, 8.4, now.Add(-40 * time.Minute)},
	{265234560, "Gothenburg Spirit", "SEGS5", 9445998, "SEGOT", 57.7061, 11.9674, 7.1, 340.0, 338, 5, 70, 6.2, now.Add(-30 * time.Minute)},
	{224890120, "Costa Verde", "EACV4", 9853667, "ESBIO", 43.3623, -8.4115, 10.9, 015.0, 13, 0, 70, 7.7, now.Add(-25 * time.Minute)},

	// ── Anomalous / dark vessels ──────────────────────────────────────────────

	// Silent 30h, no identity — CRITICAL
	{999100001, "Shadow Phoenix", "", 0, "", 51.2093, 2.9138, 0.0, 0.0, 511, 15, 80, 0.0, now.Add(-30 * time.Hour)},

	// Silent 48h, invalid heading, no identity — CRITICAL
	{999100002, "Ghost Runner", "", 0, "", 54.1833, 7.8937, 0.0, 360.0, 511, 15, 80, 0.0, now.Add(-48 * time.Hour)},

	// Silent 72h, tanker, no identity — CRITICAL
	{999100003, "Dark Horizon", "", 0, "", 36.1408, 5.3536, 0.0, 0.0, 511, 15, 80, 0.0, now.Add(-72 * time.Hour)},

	// Silent 15h — WARNING
	{999100004, "Mystery Trader", "3XMT9", 9312099, "UNKN", 45.8992, 13.0681, 0.0, 0.0, 511, 15, 70, 6.8, now.Add(-15 * time.Hour)},

	// Moored but moving — WARNING
	{999100005, "Shadow Mariner", "3ETX9", 9853864, "PA BLB", 60.3913, 5.3221, 3.2, 122.6, 119, 5, 80, 8.0, now.Add(-8 * time.Hour)},

	// Silent 9h — WARNING
	{999100006, "Phantom Voyager", "", 0, "", 48.3905, -4.4860, 0.0, 0.0, 511, 15, 80, 0.0, now.Add(-9 * time.Hour)},

	// No IMO + no callsign on tanker, invalid heading while slow — WARNING
	{999100007, "Silent Kraken", "", 0, "", 43.2965, 5.3811, 1.8, 220.0, 511, 0, 80, 0.0, now.Add(-3 * time.Hour)},

	// Silent 24h, anchored/drifting — CRITICAL
	{999100008, "Ghost Voyager", "", 0, "", 51.9225, 4.4792, 0.0, 360.0, 511, 1, 80, 5.5, now.Add(-24 * time.Hour)},

	// Silent 36h — CRITICAL
	{999100009, "Invisible Tide", "BSIT4", 9201556, "", 55.3000, 14.8000, 0.0, 0.0, 511, 15, 70, 7.2, now.Add(-36 * time.Hour)},

	// Anchored but moving fast — WARNING
	{999100010, "Restless Anchor", "RSAN5", 9312778, "UNKN", 41.3851, 2.1734, 4.7, 090.0, 88, 1, 70, 8.1, now.Add(-2 * time.Hour)},
}

func seedVessels(ctx context.Context, pool *pgxpool.Pool) error {
	for _, v := range vessels {
		lastAIS := v.lastAIS
		if lastAIS.IsZero() {
			lastAIS = now.Add(-time.Duration(10+v.mmsi%50) * time.Minute)
		}

		_, err := pool.Exec(ctx, `
			INSERT INTO vessels
			    (mmsi, name, callsign, imo, dest, lat, lon, sog, cog, heading, nav_stat, vessel_type, draught, last_ais, updated_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
			ON CONFLICT (mmsi) DO UPDATE SET
			    name=EXCLUDED.name, callsign=EXCLUDED.callsign, imo=EXCLUDED.imo,
			    dest=EXCLUDED.dest, lat=EXCLUDED.lat, lon=EXCLUDED.lon,
			    sog=EXCLUDED.sog, cog=EXCLUDED.cog, heading=EXCLUDED.heading,
			    nav_stat=EXCLUDED.nav_stat, vessel_type=EXCLUDED.vessel_type,
			    draught=EXCLUDED.draught, last_ais=EXCLUDED.last_ais, updated_at=NOW()
		`, v.mmsi, v.name, v.callsign, v.imo, v.dest,
			v.lat, v.lon, v.sog, v.cog, v.heading,
			v.navStat, v.vType, v.draught, lastAIS)
		if err != nil {
			return fmt.Errorf("insert vessel %d: %w", v.mmsi, err)
		}

		// Insert 2 position history entries per vessel
		for i, offset := range []time.Duration{5 * time.Minute, 65 * time.Minute} {
			dlat := float64(i)*0.012 + 0.005
			dlon := float64(i)*0.008 + 0.003
			_, err := pool.Exec(ctx,
				`INSERT INTO positions (mmsi, lat, lon, sog, recorded_at) VALUES ($1,$2,$3,$4,$5)`,
				v.mmsi, v.lat-dlat, v.lon-dlon, v.sog, now.Add(-offset))
			if err != nil {
				return fmt.Errorf("insert position for %d: %w", v.mmsi, err)
			}
		}
	}
	return nil
}

// ── Alert generation ──────────────────────────────────────────────────────────

type alert struct {
	mmsi       int64
	vesselName string
	severity   string
	reason     string
	confidence int
	lat, lon   float64
}

func seedAlerts(ctx context.Context, pool *pgxpool.Pool) error {
	// Wipe existing demo alerts to avoid duplication on re-seed
	if _, err := pool.Exec(ctx, `DELETE FROM alerts`); err != nil {
		return err
	}

	alerts := []alert{
		{999100003, "Dark Horizon", "CRITICAL", "AIS dark for 72h — exceeds 24h threshold", 100, 36.1408, 5.3536},
		{999100002, "Ghost Runner", "CRITICAL", "AIS dark for 48h — exceeds 24h threshold", 95, 54.1833, 7.8937},
		{999100008, "Ghost Voyager", "CRITICAL", "AIS dark for 24h — exceeds 24h threshold", 85, 51.9225, 4.4792},
		{999100009, "Invisible Tide", "CRITICAL", "AIS dark for 36h — exceeds 24h threshold", 90, 55.3000, 14.8000},
		{999100001, "Shadow Phoenix", "CRITICAL", "AIS dark for 30h — exceeds 24h threshold; no IMO or callsign", 100, 51.2093, 2.9138},
		{999100004, "Mystery Trader", "WARNING", "AIS dark for 15h", 55, 45.8992, 13.0681},
		{999100006, "Phantom Voyager", "WARNING", "AIS dark for 9h; no IMO or callsign on commercial vessel", 85, 48.3905, -4.4860},
		{999100005, "Shadow Mariner", "WARNING", "Reporting Moored but moving at 3.2 kn; AIS dark for 8h", 90, 60.3913, 5.3221},
		{999100010, "Restless Anchor", "WARNING", "Reporting At anchor but moving at 4.7 kn", 65, 41.3851, 2.1734},
		{999100007, "Silent Kraken", "WARNING", "No IMO or callsign on commercial vessel; invalid heading while underway", 80, 43.2965, 5.3811},
	}

	for _, a := range alerts {
		_, err := pool.Exec(ctx, `
			INSERT INTO alerts (mmsi, vessel_name, severity, reason, confidence, lat, lon, status)
			VALUES ($1,$2,$3,$4,$5,$6,$7,'NEW')
		`, a.mmsi, a.vesselName, a.severity, a.reason, a.confidence, a.lat, a.lon)
		if err != nil {
			return fmt.Errorf("insert alert for %d: %w", a.mmsi, err)
		}
	}
	return nil
}

// ── Satellite detections ──────────────────────────────────────────────────────

func seedSatelliteDetections(ctx context.Context, pool *pgxpool.Pool) error {
	if _, err := pool.Exec(ctx, `DELETE FROM satellite_detections`); err != nil {
		return err
	}

	detectedAt := now.Add(-2 * time.Hour)

	// Matched detections — satellite confirms an AIS vessel is where it says it is
	matched := []struct {
		lat, lon    float64
		mmsi        int64
		vesselName  string
	}{
		{55.677, 12.571, 211345670, "Nordic Pioneer"},
		{60.393, 5.324, 257123450, "Fjord Carrier"},
		{51.924, 4.481, 244876540, "Rotterdam Star"},
		{47.283, -2.511, 227345670, "Bretagne Express"},
		{37.940, 23.648, 239567890, "Aegean Horizon"},
		{45.442, 12.317, 247234560, "Adriatic Star"},
		{57.710, 11.976, 265789010, "Baltic Queen"},
		{53.578, 10.017, 211567890, "Elbe Mariner"},
		{51.509, -0.126, 232789010, "Thames Trader"},
		{44.407, 8.948, 247890120, "Tyrrhenian Star"},
		{63.432, 10.397, 257890120, "Arctic Dawn"},
	}
	for _, m := range matched {
		_, err := pool.Exec(ctx, `
			INSERT INTO satellite_detections (lat, lon, detected_at, source, matched_mmsi, matched_name)
			VALUES ($1,$2,$3,'simulated',$4,$5)
		`, m.lat, m.lon, detectedAt, m.mmsi, m.vesselName)
		if err != nil {
			return fmt.Errorf("insert matched detection: %w", err)
		}
	}

	// Unmatched detections — satellite sees a vessel but no AIS signal (dark vessel candidates)
	unmatched := []struct{ lat, lon float64 }{
		{51.209, 2.914},  // Shadow Phoenix last position — satellite confirms it's still there
		{54.185, 7.895},  // Ghost Runner
		{36.141, 5.354},  // Dark Horizon
		{51.923, 4.479},  // Ghost Voyager
		{55.301, 14.801}, // Invisible Tide
		// Extra ghost contacts in shipping lanes with no known vessel
		{50.891, 1.412},  // Dover Strait ghost
		{36.012, -5.803}, // Gibraltar ghost
		{43.512, 7.198},  // Ligurian Sea ghost
	}
	for _, u := range unmatched {
		_, err := pool.Exec(ctx, `
			INSERT INTO satellite_detections (lat, lon, detected_at, source)
			VALUES ($1,$2,$3,'simulated')
		`, u.lat, u.lon, detectedAt)
		if err != nil {
			return fmt.Errorf("insert unmatched detection: %w", err)
		}
	}

	fmt.Printf("  → %d matched + %d unmatched satellite detections\n", len(matched), len(unmatched))
	return nil
}
