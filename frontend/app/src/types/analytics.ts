import type { SatelliteDetection } from "./dashboard";

export interface ZoneStats {
  name: string;
  total_detections: number;
  matched_count: number;
  unmatched_count: number;
  match_rate: number;
  dark_vessels: number;
  alert_count: number;
  critical_alerts: number;
  avg_risk_score: number;
}

export interface NameCount {
  name: string;
  count: number;
}

export interface ZoneAlert {
  id: number;
  mmsi: number;
  vessel_name: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  reason: string;
  confidence: number;
  lat: number;
  lon: number;
  status: string;
  created_at: string;
}

export interface ZoneDetail extends ZoneStats {
  vessel_type_breakdown: NameCount[];
  alert_severity_breakdown: NameCount[];
  recent_alerts: ZoneAlert[];
  recent_detections: SatelliteDetection[];
}

export interface AnalyticsOverview {
  total_detections: number;
  overall_match_rate: number;
  highest_risk_zone: string;
  zones_covered: number;
  total_dark_vessels: number;
  total_alerts: number;
}

export type ZoneMetric = "detections" | "dark_vessels" | "alerts" | "match_rate";
export type TimeRange = "24" | "48" | "168";
