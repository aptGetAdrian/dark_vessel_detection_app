import { MapPin, Clock } from "lucide-react";

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

interface AlertBadgeProps {
  severity: AlertSeverity;
}

interface StatusBadgeProps {
  status: AlertStatus;
}

function AlertBadge({ severity }: AlertBadgeProps) {
  const styles: Record<AlertSeverity, string> = {
    CRITICAL: "bg-[#5c1a1a] text-[#f87171] border border-[#7f2b2b]",
    WARNING: "bg-[#4a3300] text-[#f59e0b] border border-[#7a5500]",
    INFO: "bg-[#0c2a4a] text-[#60a5fa] border border-[#1a4a7a]",
  };

  const dotStyles: Record<AlertSeverity, string> = {
    CRITICAL: "bg-[#f87171]",
    WARNING: "bg-[#f59e0b]",
    INFO: "bg-[#60a5fa]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide ${styles[severity]}`}
    >
      <span className={`size-1.5 rounded-full ${dotStyles[severity]}`} />
      {severity}
    </span>
  );
}

function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<AlertStatus, string> = {
    NEW: "text-[#22d3ee] font-semibold",
    "UNDER REVIEW": "text-[#f59e0b] font-semibold",
    RESOLVED: "text-[#4ade80] font-semibold",
  };

  return (
    <span className={`text-xs tracking-wide ${styles[status]}`}>{status}</span>
  );
}

interface RecentAlertsProps {
  alerts: VesselAlert[];
  className?: string;
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

export function RecentAlerts({ alerts, className = "" }: RecentAlertsProps) {
  return (
    <div
      className={`flex flex-col rounded-2xl border border-border-subtle bg-bg-panel shadow-panel ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">
          Recent Alerts
        </h2>
        <span className="rounded-full bg-[#1e2a3a] px-2 py-0.5 text-xs text-text-muted">
          {alerts.length} total
        </span>
      </div>

      {/* Alert list */}
      <div className="flex flex-col divide-y divide-border-subtle overflow-y-auto">
        {alerts.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-text-muted">
            No recent alerts
          </p>
        ) : (
          alerts.map((alert) => (
            <article
              key={alert.id}
              className="flex flex-col gap-2.5 px-4 py-3.5 transition-colors hover:bg-white/0.02"
            >
              {/* Top row: badges + ID */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertBadge severity={alert.severity} />
                  <StatusBadge status={alert.status} />
                </div>
                <span className="shrink-0 font-mono text-xs text-text-muted">
                  {alert.id}
                </span>
              </div>

              {/* Vessel name */}
              <p className="text-sm font-bold tracking-widest text-text-primary">
                {alert.vesselName}
              </p>

              {/* Description */}
              <p className="text-xs leading-relaxed text-text-muted">
                {alert.description}
              </p>

              {/* Meta row: location, time, confidence */}
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <MapPin className="size-3 shrink-0" />
                  {alert.location}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3 shrink-0" />
                  {formatAlertTime(alert.timestamp)}
                </span>
                <span className="ml-auto shrink-0">
                  Confidence:{" "}
                  <span
                    className={
                      alert.confidence >= 90
                        ? "font-semibold text-[#22d3ee]"
                        : alert.confidence >= 75
                          ? "font-semibold text-[#60a5fa]"
                          : "font-semibold text-[#f59e0b]"
                    }
                  >
                    {alert.confidence}%
                  </span>
                </span>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
