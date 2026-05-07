import { useState, useMemo } from "react";
import {
  MapPin,
  Clock,
  ChevronDown,
  ArrowUpDown,
  Crosshair,
  AlertTriangle,
} from "lucide-react";
import type {
  AlertSeverity,
  AlertStatus,
  VesselAlert,
} from "@/types/dashboard";

const ANOMALY_DESCRIPTIONS: Record<string, string> = {
  NAVSTAT_MISMATCH:
    "Reports Moored but SOG > 0; possible transponder manipulation",
  IDENTITY_INCOMPLETE:
    "Missing IMO and callsign on commercial vessel",
  COG_HEADING_DELTA:
    "COG/Heading delta >30°: possible spoofing or GPS drift",
  IMPOSSIBLE_TRAVEL:
    "Moved faster than vessel type maximum speed",
  EXTENDED_SILENCE:
    "AIS silent for an extended period; operating dark",
};

type SortMode = "newest" | "confidence" | "severity";
type FilterKey = "ALL" | AlertSeverity;

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  CRITICAL: 0,
  WARNING: 1,
  INFO: 2,
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "CRITICAL", label: "Critical" },
  { key: "WARNING", label: "Warning" },
  { key: "INFO", label: "Info" },
];

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "confidence", label: "Confidence" },
  { key: "severity", label: "Severity" },
];

const FILTER_COLORS: Record<FilterKey, { active: string; count: string }> = {
  ALL: {
    active: "bg-accent-soft text-accent",
    count: "bg-bg-surface text-text-muted",
  },
  CRITICAL: {
    active: "bg-severity-critical-bg text-status-alert border border-severity-critical-border",
    count: "text-status-alert",
  },
  WARNING: {
    active: "bg-severity-warning-bg text-status-warning border border-severity-warning-border",
    count: "text-status-warning",
  },
  INFO: {
    active: "bg-severity-info-bg text-status-info border border-severity-info-border",
    count: "text-status-info",
  },
};

function AlertBadge({ severity }: { severity: AlertSeverity }) {
  const styles: Record<AlertSeverity, string> = {
    CRITICAL:
      "bg-severity-critical-bg text-status-alert border border-severity-critical-border",
    WARNING:
      "bg-severity-warning-bg text-status-warning border border-severity-warning-border",
    INFO: "bg-severity-info-bg text-status-info border border-severity-info-border",
  };

  const dotStyles: Record<AlertSeverity, string> = {
    CRITICAL: "bg-status-alert",
    WARNING: "bg-status-warning",
    INFO: "bg-status-info",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${styles[severity]}`}
    >
      <span className={`size-1.5 rounded-full ${dotStyles[severity]}`} />
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: AlertStatus }) {
  const styles: Record<AlertStatus, string> = {
    NEW: "text-status-new",
    "UNDER REVIEW": "text-status-warning",
    RESOLVED: "text-status-safe",
  };

  return (
    <span className={`text-[10px] font-semibold tracking-wide ${styles[status]}`}>
      {status}
    </span>
  );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const color =
    confidence >= 90
      ? "bg-status-safe"
      : confidence >= 75
        ? "bg-status-info"
        : "bg-status-warning";

  return (
    <div className="flex items-center gap-2">
      <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-bg-surface">
        <div
          className={`h-full rounded-full ${color} transition-[width] duration-500`}
          style={{ width: `${confidence}%` }}
        />
      </div>
      <span
        className={`shrink-0 text-[10px] font-semibold tabular-nums ${
          confidence >= 90
            ? "text-status-safe"
            : confidence >= 75
              ? "text-status-info"
              : "text-status-warning"
        }`}
      >
        {confidence}%
      </span>
    </div>
  );
}

function formatAlertTime(date: Date): string {
  return date.toLocaleString("en-GB", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

interface AlertRowProps {
  alert: VesselAlert;
  isExpanded: boolean;
  onToggle: () => void;
  onCenter?: () => void;
}

function AlertRow({ alert, isExpanded, onToggle, onCenter }: AlertRowProps) {
  const anomalyFlags = alert.description.match(/Flags: (.+)\./)?.[1]?.split(", ") ?? [];

  return (
    <article
      className="border-b border-border-subtle last:border-0"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors hover:bg-white/[0.02] focus-visible:outline-accent"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertBadge severity={alert.severity} />
            <StatusBadge status={alert.status} />
          </div>
          <ChevronDown
            className={`size-3.5 shrink-0 text-text-muted transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold tracking-wide text-text-primary truncate">
            {alert.vesselName}
          </p>
          <span className="flex shrink-0 items-center gap-1 text-[10px] text-text-muted">
            <Clock className="size-2.5" />
            {formatAlertTime(alert.timestamp)}
          </span>
        </div>

        <ConfidenceBar confidence={alert.confidence} />
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-300"
        style={{
          gridTemplateRows: isExpanded ? "1fr" : "0fr",
        }}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-3 px-4 pb-4 pt-1">
            <p className="text-xs leading-relaxed text-text-muted">
              {alert.description}
            </p>

            {anomalyFlags.length > 0 && (
              <div className="rounded-lg border border-severity-warning-border bg-severity-warning-bg/40 px-3 py-2 space-y-1">
                <p className="flex items-center gap-1 text-[10px] font-semibold text-status-warning">
                  <AlertTriangle className="size-3" />
                  Anomalies
                </p>
                {anomalyFlags.map((flag) => (
                  <p key={flag} className="text-[11px] text-text-muted">
                    <span className="font-mono text-[10px] text-status-alert">
                      {flag}
                    </span>{" "}
                    {ANOMALY_DESCRIPTIONS[flag] ?? "Unknown anomaly"}
                  </p>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 text-[11px] text-text-muted">
              <span className="flex items-center gap-1">
                <MapPin className="size-3" />
                {alert.location}
              </span>
              <span className="font-mono">{alert.id}</span>
            </div>

            {onCenter && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCenter();
                }}
                className="flex items-center gap-1.5 self-start rounded-lg border border-border-subtle bg-bg-surface px-3 py-1.5 text-[11px] font-medium text-text-primary transition-colors hover:bg-accent-soft hover:text-accent focus-visible:outline-accent"
              >
                <Crosshair className="size-3" />
                Center on map
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

interface RecentAlertsProps {
  alerts: VesselAlert[];
  className?: string;
  onCenterVessel?: (lat: number, lon: number) => void;
}

export function RecentAlerts({
  alerts,
  className = "",
  onCenterVessel,
}: RecentAlertsProps) {
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { ALL: alerts.length, CRITICAL: 0, WARNING: 0, INFO: 0 };
    for (const a of alerts) c[a.severity]++;
    return c;
  }, [alerts]);

  const processed = useMemo(() => {
    let list = filter === "ALL" ? alerts : alerts.filter((a) => a.severity === filter);

    list = [...list].sort((a, b) => {
      switch (sortMode) {
        case "confidence":
          return b.confidence - a.confidence;
        case "severity": {
          const diff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
          return diff !== 0 ? diff : b.timestamp.getTime() - a.timestamp.getTime();
        }
        default:
          return b.timestamp.getTime() - a.timestamp.getTime();
      }
    });

    return list;
  }, [alerts, filter, sortMode]);

  function parseCoordsFromLocation(location: string): { lat: number; lon: number } | null {
    const match = location.match(/([\d.-]+)°[NS],?\s*([\d.-]+)°[EW]/);
    if (!match) return null;
    return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
  }

  return (
    <div
      className={`flex flex-col rounded-2xl border border-border-subtle bg-bg-panel shadow-panel ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">
          Recent Alerts
        </h2>
        <span className="rounded-full bg-bg-surface px-2 py-0.5 text-xs tabular-nums text-text-muted">
          {alerts.length}
        </span>
      </div>

      {/* Filters + sort */}
      <div className="flex items-center border-b border-border-subtle px-4 pb-3">
        <div
          className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {FILTERS.map((f) => {
            const isActive = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setFilter(f.key);
                  setExpandedId(null);
                }}
                className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold tracking-wide transition-colors focus-visible:outline-accent ${
                  isActive
                    ? FILTER_COLORS[f.key].active
                    : "text-text-muted hover:text-text-primary hover:bg-bg-surface"
                }`}
              >
                {f.label}
                {counts[f.key] > 0 && (
                  <span
                    className={`ml-1 tabular-nums ${
                      isActive ? "" : FILTER_COLORS[f.key].count
                    }`}
                  >
                    {counts[f.key]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            const modes: SortMode[] = ["newest", "confidence", "severity"];
            const idx = modes.indexOf(sortMode);
            setSortMode(modes[(idx + 1) % modes.length]);
          }}
          className="ml-2 flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-text-muted transition-colors focus-visible:outline-accent hover:text-text-primary hover:bg-bg-surface"
          title={`Sort: ${SORT_OPTIONS.find((s) => s.key === sortMode)?.label}`}
        >
          <ArrowUpDown className="size-3" />
          {SORT_OPTIONS.find((s) => s.key === sortMode)?.label}
        </button>
      </div>

      {/* Alert list */}
      <div className="flex-1 overflow-y-auto">
        {processed.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-text-muted">
            {filter === "ALL"
              ? "No recent alerts"
              : `No ${filter.toLowerCase()} alerts`}
          </p>
        ) : (
          processed.map((alert) => (
            <AlertRow
              key={alert.id}
              alert={alert}
              isExpanded={expandedId === alert.id}
              onToggle={() =>
                setExpandedId(expandedId === alert.id ? null : alert.id)
              }
              onCenter={
                onCenterVessel
                  ? () => {
                      const coords = parseCoordsFromLocation(alert.location);
                      if (coords) onCenterVessel(coords.lat, coords.lon);
                    }
                  : undefined
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
