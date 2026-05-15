import { AIS_HEADING_UNAVAILABLE, AIS_COG_UNAVAILABLE, AIS_SOG_UNAVAILABLE } from "@/lib/constants";
import { resolvePort } from "@/lib/ports";
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

function haversineNM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface ETAResult {
  portName: string;
  distanceNM: number;
  etaDate: Date;
  etaLabel: string; // e.g. "in 4h 32m" or "in 2d 3h"
}

export function estimateETA(vessel: Vessel): ETAResult | null {
  if (!vessel.dest || !vessel.sog || vessel.sog < 0.5 || vessel.sog === AIS_SOG_UNAVAILABLE) return null;
  const port = resolvePort(vessel.dest);
  if (!port) return null;

  const distanceNM = haversineNM(vessel.lat, vessel.lon, port.lat, port.lon);
  const hoursRemaining = distanceNM / vessel.sog;
  const etaDate = new Date(Date.now() + hoursRemaining * 3_600_000);

  let etaLabel: string;
  if (hoursRemaining < 1) {
    etaLabel = `in ${Math.round(hoursRemaining * 60)}m`;
  } else if (hoursRemaining < 48) {
    const h = Math.floor(hoursRemaining);
    const m = Math.round((hoursRemaining - h) * 60);
    etaLabel = m > 0 ? `in ${h}h ${m}m` : `in ${h}h`;
  } else {
    const d = Math.floor(hoursRemaining / 24);
    const h = Math.floor(hoursRemaining % 24);
    etaLabel = h > 0 ? `in ${d}d ${h}h` : `in ${d}d`;
  }

  return { portName: port.name, distanceNM: Math.round(distanceNM), etaDate, etaLabel };
}
