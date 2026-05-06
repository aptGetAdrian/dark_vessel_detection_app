import { AlertTriangle } from "lucide-react";

interface VesselStatusBadgeProps {
  isDark: boolean;
  label?: string;
}

export function VesselStatusBadge({ isDark, label }: VesselStatusBadgeProps) {
  if (isDark) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#5c1a1a] px-2.5 py-1 text-xs font-bold tracking-wide text-[#f87171] border border-[#7f2b2b]">
        <span className="size-1.5 rounded-full bg-[#f87171]" />
        {label ?? "DARK"}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0c2a4a] px-2.5 py-1 text-xs font-bold tracking-wide text-status-info border border-[#1a4a7a]">
      <span className="size-1.5 rounded-full bg-status-info" />
      ACTIVE
    </span>
  );
}

export function AnomalyBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#4a3300] px-2.5 py-1 text-xs font-bold tracking-wide text-[#f59e0b] border border-[#7a5500]">
      <AlertTriangle className="size-3" />
      ANOMALY
    </span>
  );
}
