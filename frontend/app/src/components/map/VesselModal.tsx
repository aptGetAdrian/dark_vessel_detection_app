import { X, AlertTriangle, Clock, MapPin } from "lucide-react";
import type { Vessel } from "@/types/dashboard";
import { VesselStatusBadge, AnomalyBadge } from "@/components/ui/VesselStatusBadge";
import {
  formatTimeAgo,
  formatCoord,
  formatMMSI,
  formatSOG,
  formatCOG,
  formatHeading,
  hasFlag,
} from "@/lib/formatters";
import { RISK_CRITICAL_THRESHOLD, CONFIDENCE_LOW_THRESHOLD } from "@/lib/constants";

interface VesselModalProps {
  vessel: Vessel;
  isDark: boolean;
  onClose: () => void;
}

interface RowProps {
  label: string;
  value: string;
  anomaly?: boolean;
  icon?: React.ReactNode;
}

function Row({ label, value, anomaly = false, icon }: RowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-border-subtle last:border-0">
      <dt className="flex items-center gap-1.5 text-xs text-text-muted shrink-0">
        {icon}
        {label}
      </dt>
      <dd className={`font-mono text-sm text-right ${anomaly ? "text-[#f87171] font-semibold" : "text-text-primary"}`}>
        {anomaly && <AlertTriangle className="inline size-3.5 mr-1 mb-0.5" />}
        {value}
      </dd>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-1 mt-4 first:mt-0">
      {children}
    </p>
  );
}

export function VesselModal({ vessel, isDark, onClose }: VesselModalProps) {
  const flags = vessel.anomaly_flags ?? [];
  const hasAnomalies = flags.length > 0;
  const isMooredButMoving = hasFlag(vessel, "NAVSTAT_MISMATCH");
  const isMissingIdentity = hasFlag(vessel, "IDENTITY_INCOMPLETE");
  const isHeadingDelta = hasFlag(vessel, "COG_HEADING_DELTA");
  const isImpossibleTravel = hasFlag(vessel, "IMPOSSIBLE_TRAVEL");
  const isExtendedSilence = hasFlag(vessel, "EXTENDED_SILENCE");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-border-subtle bg-bg-panel shadow-panel mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center gap-3 px-5 py-4 border-b border-border-subtle border-l-4 rounded-tl-2xl rounded-tr-2xl ${isDark ? "border-l-status-alert" : "border-l-status-info"}`}>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold tracking-widest text-text-primary uppercase truncate">
              {vessel.name}
            </p>
            <p className="font-mono text-xs text-text-muted mt-0.5">MMSI {formatMMSI(vessel.mmsi)}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <VesselStatusBadge isDark={isDark} />
            {hasAnomalies && <AnomalyBadge />}
          </div>

          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-surface hover:text-text-primary"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <SectionTitle>Identity</SectionTitle>
          <dl>
            <Row label="IMO" value={vessel.imo ? String(vessel.imo) : "—"} anomaly={isMissingIdentity} />
            <Row label="Callsign" value={vessel.callsign || "—"} anomaly={isMissingIdentity} />
            <Row label="Vessel type" value={vessel.type_name || "—"} />
          </dl>

          <SectionTitle>Navigation</SectionTitle>
          <dl>
            <Row label="Nav status" value={vessel.navstat_name || "—"} anomaly={isMooredButMoving} />
            <Row label="Speed (SOG)" value={formatSOG(vessel.sog)} anomaly={isMooredButMoving} />
            <Row label="Course (COG)" value={formatCOG(vessel.cog)} anomaly={isHeadingDelta} />
            <Row label="Heading" value={formatHeading(vessel.heading)} anomaly={isHeadingDelta} />
            {(vessel.draught ?? 0) > 0 && (
              <Row label="Draught" value={`${vessel.draught.toFixed(1)} m`} />
            )}
            {vessel.dest && (
              <Row label="Destination" value={vessel.dest} />
            )}
          </dl>

          <SectionTitle>Position</SectionTitle>
          <dl>
            <Row
              label="Last AIS"
              value={formatTimeAgo(vessel.last_ais)}
              anomaly={isDark}
              icon={<Clock className="size-3" />}
            />
            <Row
              label="Coordinates"
              value={formatCoord(vessel.lat, vessel.lon)}
              icon={<MapPin className="size-3" />}
            />
          </dl>

          <SectionTitle>Detection</SectionTitle>
          <dl>
            <Row
              label="Confidence"
              value={vessel.confidence != null ? `${vessel.confidence}%` : "—"}
              anomaly={(vessel.confidence ?? 100) < CONFIDENCE_LOW_THRESHOLD}
            />
            <Row
              label="Risk score"
              value={vessel.risk_score != null ? String(vessel.risk_score) : "—"}
              anomaly={(vessel.risk_score ?? 0) >= RISK_CRITICAL_THRESHOLD}
            />
          </dl>

          {hasAnomalies && (
            <div className="mt-4 rounded-lg border border-[#7a5500] bg-[#4a3300]/40 px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-[#f59e0b] flex items-center gap-1.5">
                <AlertTriangle className="size-3.5" />
                Detected anomalies
              </p>
              {isMooredButMoving && (
                <p className="text-xs text-text-muted">· Vessel reports <span className="text-[#f87171]">Moored</span> but SOG &gt; 0 — possible transponder manipulation</p>
              )}
              {isMissingIdentity && (
                <p className="text-xs text-text-muted">· <span className="text-[#f87171]">Missing IMO and callsign</span> on commercial vessel — identity unverifiable</p>
              )}
              {isHeadingDelta && (
                <p className="text-xs text-text-muted">· <span className="text-[#f87171]">COG/Heading delta &gt;30°</span> — possible spoofing or GPS drift</p>
              )}
              {isImpossibleTravel && (
                <p className="text-xs text-text-muted">· <span className="text-[#f87171]">Impossible travel detected</span> — vessel moved faster than its type's maximum speed</p>
              )}
              {isExtendedSilence && (
                <p className="text-xs text-text-muted">· AIS signal <span className="text-[#f87171]">silent for an extended period</span> — vessel may be operating dark</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
