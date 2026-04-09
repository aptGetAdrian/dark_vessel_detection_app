import { X, AlertTriangle, Clock, MapPin } from "lucide-react";
import type { Vessel } from "@/types/dashboard";

interface VesselModalProps {
  vessel: Vessel;
  isDark: boolean;
  onClose: () => void;
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

function formatSOG(sog: number | undefined): string {
  if (sog == null || sog === 102.4) return "N/A";
  return `${sog.toFixed(1)} kts`;
}

function formatCOG(cog: number | undefined): string {
  if (cog == null || cog === 360.0) return "N/A";
  return `${cog.toFixed(1)}°`;
}

interface Anomalies {
  mooredButMoving: boolean;
  missingIdentity: boolean;
  headingCourseDelta: boolean;
}

function detectAnomalies(vessel: Vessel): Anomalies {
  const mooredButMoving = vessel.navstat === 5 && (vessel.sog ?? 0) > 0;
  const missingIdentity =
    !vessel.imo &&
    !vessel.callsign &&
    vessel.type >= 70 && vessel.type <= 89;
  const headingAvailable = vessel.heading != null && vessel.heading !== 511;
  const cogAvailable = vessel.cog != null && vessel.cog !== 360.0;
  const headingCourseDelta =
    headingAvailable &&
    cogAvailable &&
    Math.abs(vessel.cog - vessel.heading) > 30;

  return { mooredButMoving, missingIdentity, headingCourseDelta };
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
  const anomalies = detectAnomalies(vessel);
  const hasAnomalies = Object.values(anomalies).some(Boolean);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Panel */}
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
            {isDark ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#5c1a1a] px-2.5 py-1 text-xs font-bold tracking-wide text-[#f87171] border border-[#7f2b2b]">
                <span className="size-1.5 rounded-full bg-[#f87171]" />
                DARK
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0c2a4a] px-2.5 py-1 text-xs font-bold tracking-wide text-status-info border border-[#1a4a7a]">
                <span className="size-1.5 rounded-full bg-status-info" />
                ACTIVE
              </span>
            )}
            {hasAnomalies && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#4a3300] px-2.5 py-1 text-xs font-bold tracking-wide text-[#f59e0b] border border-[#7a5500]">
                <AlertTriangle className="size-3" />
                ANOMALY
              </span>
            )}
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
          {/* Identity */}
          <SectionTitle>Identity</SectionTitle>
          <dl>
            <Row label="IMO" value={vessel.imo ? String(vessel.imo) : "—"} anomaly={anomalies.missingIdentity} />
            <Row label="Callsign" value={vessel.callsign || "—"} anomaly={anomalies.missingIdentity} />
            <Row label="Vessel type" value={vessel.type_name || "—"} />
          </dl>

          {/* Navigation */}
          <SectionTitle>Navigation</SectionTitle>
          <dl>
            <Row label="Nav status" value={vessel.navstat_name || "—"} anomaly={anomalies.mooredButMoving} />
            <Row label="Speed (SOG)" value={formatSOG(vessel.sog)} anomaly={anomalies.mooredButMoving} />
            <Row label="Course (COG)" value={formatCOG(vessel.cog)} anomaly={anomalies.headingCourseDelta} />
            <Row
              label="Heading"
              value={vessel.heading == null || vessel.heading === 511 ? "N/A" : `${vessel.heading}°`}
              anomaly={anomalies.headingCourseDelta}
            />
            {(vessel.draught ?? 0) > 0 && (
              <Row label="Draught" value={`${vessel.draught.toFixed(1)} m`} />
            )}
            {vessel.dest && (
              <Row label="Destination" value={vessel.dest} />
            )}
          </dl>

          {/* Position */}
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

          {/* Anomaly summary */}
          {hasAnomalies && (
            <div className="mt-4 rounded-lg border border-[#7a5500] bg-[#4a3300]/40 px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-[#f59e0b] flex items-center gap-1.5">
                <AlertTriangle className="size-3.5" />
                Detected anomalies
              </p>
              {anomalies.mooredButMoving && (
                <p className="text-xs text-text-muted">· Vessel reports <span className="text-[#f87171]">Moored</span> but SOG &gt; 0 — possible transponder manipulation</p>
              )}
              {anomalies.missingIdentity && (
                <p className="text-xs text-text-muted">· <span className="text-[#f87171]">Missing IMO and callsign</span> on commercial vessel — identity unverifiable</p>
              )}
              {anomalies.headingCourseDelta && (
                <p className="text-xs text-text-muted">· <span className="text-[#f87171]">COG/Heading delta &gt;30°</span> — possible spoofing or GPS drift</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
