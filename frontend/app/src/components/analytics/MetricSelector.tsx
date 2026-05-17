import type { ZoneMetric } from "@/types/analytics";

const OPTIONS: { value: ZoneMetric; label: string }[] = [
  { value: "detections", label: "Detections" },
  { value: "dark_vessels", label: "Dark Vessels" },
  { value: "alerts", label: "Alerts" },
  { value: "match_rate", label: "Match Rate" },
];

interface Props {
  value: ZoneMetric;
  onChange: (v: ZoneMetric) => void;
}

export function MetricSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border-subtle bg-bg-panel p-0.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            value === opt.value
              ? "bg-bg-surface text-text-primary"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
