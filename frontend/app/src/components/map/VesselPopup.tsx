import { Popup } from "react-map-gl/mapbox";
import { X, Clock, MapPin } from "lucide-react";
import type { Vessel } from "@/types/dashboard";
import { VesselStatusBadge } from "@/components/ui/VesselStatusBadge";
import { formatTimeAgo, formatCoord, formatMMSI } from "@/lib/formatters";

interface VesselPopupProps {
  vessel: Vessel;
  isDark: boolean;
  onClose: () => void;
  onViewMore: () => void;
}

export function VesselPopup({ vessel, isDark, onClose, onViewMore }: VesselPopupProps) {
  const accentColor = isDark ? "bg-status-alert" : "bg-status-info";

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
      <div className="w-56 rounded-xl border border-border-subtle bg-bg-panel shadow-panel">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-subtle">
          <span className={`size-2 shrink-0 rounded-full ${accentColor}`} />
          <span className="flex-1 truncate text-sm font-semibold tracking-wide text-text-primary uppercase">
            {vessel.name}
          </span>
          <button
            onClick={onClose}
            className="shrink-0 rounded p-1 text-text-muted transition-colors hover:bg-bg-surface hover:text-text-primary"
            aria-label="Close"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Status badge */}
        <div className="px-3 pt-2.5 pb-1">
          <VesselStatusBadge isDark={isDark} label={isDark ? "DARK VESSEL" : undefined} />
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
            <dd className={`font-mono text-xs ${isDark ? "text-status-alert" : "text-text-primary"}`}>
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
