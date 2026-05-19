import type { LucideIcon } from "lucide-react";

export interface Vessel {
  mmsi: number;
  name: string;
  lat: number;
  lon: number;
  last_ais: string; // ISO timestamp from backend
  imo: number;
  callsign: string;
  type: number;
  type_name: string;
  sog: number;       // Speed Over Ground (knots)
  cog: number;       // Course Over Ground (degrees)
  heading: number;   // True heading, 511 = not available
  navstat: number;   // Navigational status 0–15
  navstat_name: string;
  dest: string;
  draught: number;   // metres
  prev_lat?: number;
  prev_lon?: number;
  prev_timestamp?: string;
  confidence?: number;    // 0-100, backend-calculated (lower = more suspicious)
  risk_score?: number;    // 0-100, backend-calculated (higher = more dangerous)
  anomaly_flags?: string[]; // e.g. ["IMPOSSIBLE_TRAVEL", "NAVSTAT_MISMATCH"]
  is_dark?: boolean;
}

export interface DashboardCard {
  id: string;
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconClass: string;
  iconBgClass: string;
  updatedAt: Date;
  delta: number | null;
  previousValue: number | null;
}

export type AlertSeverity = "CRITICAL" | "WARNING" | "INFO";
export type AlertStatus = "NEW" | "UNDER REVIEW" | "RESOLVED";

export interface VesselAlert {
  id: string;
  severity: AlertSeverity;
  status: AlertStatus;
  vesselName: string;
  description: string;
  location: string;
  timestamp: Date;
  confidence: number;
}

export interface TrackPosition {
  lat: number;
  lon: number;
  sog: number;
  recorded_at: string;
}

export interface SatelliteDetection {
  id: number;
  lat: number;
  lon: number;
  detected_at: string;
  source: string;
  scan_area: string;
  matched_mmsi: number | null;
  matched_name: string;
  match_distance_nm: number | null;
  created_at: string;
}

export interface HealthStatus {
  status: string;
  sources: {
    database: boolean;
    ais_stream: boolean;
    sentinel: boolean;
  };
}
