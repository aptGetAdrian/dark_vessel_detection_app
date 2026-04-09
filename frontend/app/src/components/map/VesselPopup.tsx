import { Popup } from "react-map-gl/mapbox";
import { X, Clock, MapPin } from "lucide-react";
import type { Vessel } from "@/types/dashboard";

interface VesselPopupProps {
  vessel: Vessel;
  isDark: boolean;
  onClose: () => void;
  onViewMore: () => void;
}

function formatTimeAgo(isoTimestamp: string): string {
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

function formatCoord(lat: number, lon: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}°${latDir} · ${Math.abs(lon).toFixed(4)}°${lonDir}`;
}

function formatMMSI(mmsi: string): string {
  return mmsi.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");
}

export function VesselPopup({ vessel, isDark, onClose, onViewMore }: VesselPopupProps) {
  const accentColor = isDark ? "bg-status-alert" : "bg-status-info";
  const borderColor = isDark ? "border-l-status-alert" : "border-l-status-info";

  return (
    <Popup
      latitude={vessel.lat}
      longitude={vessel.lon}
      anchor="bottom"
      offset={14}
      closeButton={false}
      closeOnClick={false}
      onClose={onClose}
      className="vessel-popup"
    >
      <div className={`w-56 rounded-xl border border-border-subtle border-l-2 ${borderColor} bg-bg-panel shadow-panel`}>
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-subtle">
          <span className={`size-2 shrink-0 rounded-full ${accentColor}`} />
          <span className="flex-1 truncate text-sm font-bold tracking-widest text-text-primary uppercase">
            {vessel.name}
          </span>
          <button
            onClick={onClose}
            className="shrink-0 rounded p-0.5 text-text-muted transition-colors hover:bg-bg-surface hover:text-text-primary"
            aria-label="Close"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Status badge */}
        <div className="px-3 pt-2.5 pb-1">
          {isDark ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#5c1a1a] px-2.5 py-1 text-xs font-bold tracking-wide text-[#f87171] border border-[#7f2b2b]">
              <span className="size-1.5 rounded-full bg-[#f87171]" />
              DARK VESSEL
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0c2a4a] px-2.5 py-1 text-xs font-bold tracking-wide text-status-info border border-[#1a4a7a]">
              <span className="size-1.5 rounded-full bg-status-info" />
              ACTIVE
            </span>
          )}
        </div>

        {/* Key data */}
        <dl className="px-3 py-2 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-xs text-text-muted shrink-0">MMSI</dt>
            <dd className="font-mono text-xs text-text-primary">{formatMMSI(vessel.mmsi)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-1 text-xs text-text-muted shrink-0">
              <Clock className="size-3" />
              Last AIS
            </dt>
            <dd className={`font-mono text-xs ${isDark ? "text-[#f87171]" : "text-text-primary"}`}>
              {formatTimeAgo(vessel.last_ais)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-1 text-xs text-text-muted shrink-0">
              <MapPin className="size-3" />
              Position
            </dt>
            <dd className="font-mono text-xs text-text-primary text-right">
              {formatCoord(vessel.lat, vessel.lon)}
            </dd>
          </div>
        </dl>

        {/* View more */}
        <div className="px-3 pb-3">
          <button
            onClick={onViewMore}
            className="w-full rounded-lg border border-border-subtle bg-bg-surface py-1.5 text-xs font-semibold text-text-muted transition-colors hover:border-accent hover:text-text-primary"
          >
            View more
          </button>
        </div>
      </div>
    </Popup>
  );
}
