import { AIS_HEADING_UNAVAILABLE, AIS_COG_UNAVAILABLE, AIS_SOG_UNAVAILABLE } from "@/lib/constants";
import type { Vessel } from "@/types/dashboard";

export function formatTimeAgo(isoTimestamp: string): string {
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  const totalMinutes = Math.floor(diffMs / 60_000);

  if (totalMinutes < 1) return "just now";
  if (totalMinutes < 60) return `${totalMinutes}m ago`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours < 24) return minutes > 0 ? `${hours}h ${minutes}m ago` : `${hours}h ago`;

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h ago` : `${days}d ago`;
}

export function formatCoord(lat: number, lon: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}°${latDir} · ${Math.abs(lon).toFixed(4)}°${lonDir}`;
}

export function formatMMSI(mmsi: number | string): string {
  return String(mmsi).replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");
}

export function formatSOG(sog: number | undefined): string {
  if (sog == null || sog === AIS_SOG_UNAVAILABLE) return "N/A";
  return `${sog.toFixed(1)} kts`;
}

export function formatCOG(cog: number | undefined): string {
  if (cog == null || cog === AIS_COG_UNAVAILABLE) return "N/A";
  return `${cog.toFixed(1)}°`;
}

export function formatHeading(heading: number | undefined): string {
  if (heading == null || heading === AIS_HEADING_UNAVAILABLE) return "N/A";
  return `${heading}°`;
}

export function hasFlag(vessel: Vessel, flag: string): boolean {
  return vessel.anomaly_flags?.includes(flag) ?? false;
}
