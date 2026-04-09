import type { LucideIcon } from "lucide-react";

export interface Vessel {
  mmsi: string;
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
}

export interface DashboardCard {
  id: string;
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconClass: string;
  iconBgClass: string;
  updatedAt: Date;
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
