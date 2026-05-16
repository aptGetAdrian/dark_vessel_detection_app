import { useState } from "react";
import { X, AlertTriangle, Clock, MapPin, Radio, Satellite, Navigation, AlertCircle, Anchor } from "lucide-react";
import type { Vessel, TrackPosition } from "@/types/dashboard";
import { VesselStatusBadge, AnomalyBadge } from "@/components/ui/VesselStatusBadge";
import { useVesselTrack } from "@/hooks/useVesselTrack";
import {
  formatTimeAgo,
  formatCoord,
  formatMMSI,
  formatSOG,
  formatCOG,
  formatHeading,
  hasFlag,
  estimateETA,
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
      <dd className={`font-mono text-sm text-right ${anomaly ? "text-status-alert font-semibold" : "text-text-primary"}`}>
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

interface TimelineEvent {
  icon: React.ReactNode;
  label: string;
  detail: string;
  time: string;
  severity?: "critical" | "warning" | "info";
}

function buildTimeline(vessel: Vessel, positions: TrackPosition[], isDark: boolean): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  const sorted = [...positions].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
  );

  if (sorted.length > 0) {
    const first = sorted[0];
    events.push({
      icon: <Navigation className="size-3.5" />,
      label: "First tracked position",
      detail: `${first.lat.toFixed(3)}°N, ${first.lon.toFixed(3)}°E · ${first.sog.toFixed(1)} kts`,
      time: formatTimeAgo(first.recorded_at),
      severity: "info",
    });
  }

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const gapMs = new Date(curr.recorded_at).getTime() - new Date(prev.recorded_at).getTime();
    const gapHours = gapMs / 3_600_000;

    if (gapHours > 2) {
      events.push({
        icon: <Radio className="size-3.5" />,
        label: "AIS signal gap detected",
        detail: `${Math.floor(gapHours)}h gap between position reports`,
        time: formatTimeAgo(prev.recorded_at),
        severity: gapHours > 6 ? "critical" : "warning",
      });
    }

    if (curr.sog < 0.5 && prev.sog >= 2) {
      events.push({
        icon: <Anchor className="size-3.5" />,
        label: "Vessel stopped",
        detail: `Speed dropped from ${prev.sog.toFixed(1)} to ${curr.sog.toFixed(1)} kts`,
        time: formatTimeAgo(curr.recorded_at),
        severity: "info",
      });
    }
  }

  if (isDark) {
    events.push({
      icon: <AlertCircle className="size-3.5" />,
      label: "AIS signal lost",
      detail: `Last transmission ${formatTimeAgo(vessel.last_ais)}`,
      time: formatTimeAgo(vessel.last_ais),
      severity: "critical",
    });
  }

  if (vessel.anomaly_flags?.includes("IMPOSSIBLE_TRAVEL")) {
    events.push({
      icon: <AlertTriangle className="size-3.5" />,
      label: "Impossible travel flagged",
      detail: "Vessel moved faster than its type's maximum speed",
      time: formatTimeAgo(vessel.last_ais),
      severity: "critical",
    });
  }

  if (vessel.anomaly_flags?.includes("NAVSTAT_MISMATCH")) {
    events.push({
      icon: <AlertTriangle className="size-3.5" />,
      label: "NavStat mismatch",
      detail: "Reports moored/anchored but still moving",
      time: formatTimeAgo(vessel.last_ais),
      severity: "warning",
    });
  }

  if (sorted.length > 0) {
    const last = sorted[sorted.length - 1];
    events.push({
      icon: <Satellite className="size-3.5" />,
      label: "Last known position",
      detail: `${vessel.lat.toFixed(3)}°N, ${vessel.lon.toFixed(3)}°E`,
      time: formatTimeAgo(last.recorded_at),
      severity: isDark ? "warning" : "info",
    });
  }

  return events;
}

const SEVERITY_STYLES = {
  critical: "border-status-alert/40 text-status-alert",
  warning: "border-status-warning/40 text-status-warning",
  info: "border-accent/40 text-accent",
};

function InvestigationTimeline({ vessel, isDark }: { vessel: Vessel; isDark: boolean }) {
  const { positions, isLoading } = useVesselTrack(vessel.mmsi);
  const events = buildTimeline(vessel, positions, isDark);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-xs text-text-muted animate-pulse">Loading vessel history...</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-xs text-text-muted">No position history available</span>
      </div>
    );
  }

  return (
    <div className="relative pl-10">
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border-subtle" />
      <div className="space-y-5">
        {events.map((event, i) => (
          <div key={i} className="relative">
            <div
              className={`absolute -left-10 top-0 flex size-7 items-center justify-center rounded-full border bg-bg-panel ${
                SEVERITY_STYLES[event.severity ?? "info"]
              }`}
            >
              {event.icon}
            </div>
            <div>
              <p className="text-xs font-medium text-text-primary">{event.label}</p>
              <p className="text-[11px] text-text-muted mt-0.5">{event.detail}</p>
              <p className="text-[10px] text-text-muted/60 mt-0.5">{event.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VesselModal({ vessel, isDark, onClose }: VesselModalProps) {
  const [tab, setTab] = useState<"details" | "timeline">("details");
  const flags = vessel.anomaly_flags ?? [];
  const hasAnomalies = flags.length > 0;
  const eta = estimateETA(vessel);
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
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle rounded-t-2xl">
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold tracking-wide text-text-primary uppercase truncate">
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

        {/* Tab bar */}
        <div className="flex border-b border-border-subtle">
          <button
            onClick={() => setTab("details")}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
              tab === "details"
                ? "border-b-2 border-accent text-text-primary"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setTab("timeline")}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
              tab === "timeline"
                ? "border-b-2 border-accent text-text-primary"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            Investigation
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
          {tab === "details" && (
            <>
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
                {eta && (
                  <Row
                    label="ETA"
                    value={`${eta.etaLabel} · ${eta.portName} (${eta.distanceNM} NM)`}
                  />
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
                <div className="mt-4 rounded-lg border border-severity-warning-border bg-severity-warning-bg/40 px-4 py-3 space-y-1">
                  <p className="text-xs font-semibold text-status-warning flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5" />
                    Detected anomalies
                  </p>
                  {isMooredButMoving && (
                    <p className="text-xs text-text-muted">· Vessel reports <span className="text-status-alert">Moored</span> but SOG &gt; 0; possible transponder manipulation</p>
                  )}
                  {isMissingIdentity && (
                    <p className="text-xs text-text-muted">· <span className="text-status-alert">Missing IMO and callsign</span> on commercial vessel. Identity unverifiable</p>
                  )}
                  {isHeadingDelta && (
                    <p className="text-xs text-text-muted">· <span className="text-status-alert">COG/Heading delta &gt;30°</span>: possible spoofing or GPS drift</p>
                  )}
                  {isImpossibleTravel && (
                    <p className="text-xs text-text-muted">· <span className="text-status-alert">Impossible travel detected</span>. Vessel moved faster than its type's maximum speed</p>
                  )}
                  {isExtendedSilence && (
                    <p className="text-xs text-text-muted">· AIS signal <span className="text-status-alert">silent for an extended period</span>. Vessel may be operating dark</p>
                  )}
                </div>
              )}
            </>
          )}

          {tab === "timeline" && (
            <InvestigationTimeline vessel={vessel} isDark={isDark} />
          )}
        </div>
      </div>
    </div>
  );
}
