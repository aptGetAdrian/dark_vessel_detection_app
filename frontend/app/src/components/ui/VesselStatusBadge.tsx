import { AlertTriangle } from "lucide-react";

interface VesselStatusBadgeProps {
  isDark: boolean;
  label?: string;
}

export function VesselStatusBadge({ isDark, label }: VesselStatusBadgeProps) {
  if (isDark) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-severity-critical-border bg-severity-critical-bg px-2.5 py-1 text-xs font-bold tracking-wide text-status-alert">
        <span className="size-1.5 rounded-full bg-status-alert" />
        {label ?? "DARK"}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-severity-info-border bg-severity-info-bg px-2.5 py-1 text-xs font-bold tracking-wide text-status-info">
      <span className="size-1.5 rounded-full bg-status-info" />
      ACTIVE
    </span>
  );
}

export function AnomalyBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-severity-warning-border bg-severity-warning-bg px-2.5 py-1 text-xs font-bold tracking-wide text-status-warning">
      <AlertTriangle className="size-3" />
      ANOMALY
    </span>
  );
}
