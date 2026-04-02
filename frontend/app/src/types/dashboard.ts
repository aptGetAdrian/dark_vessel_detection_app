import type { LucideIcon } from "lucide-react";

export interface Vessel {
  mmsi: string;
  name: string;
  lat: number;
  lon: number;
  last_ais: string; // ISO timestamp from backend
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
