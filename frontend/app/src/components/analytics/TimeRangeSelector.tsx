import type { TimeRange } from "@/types/analytics";

const OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "24", label: "24h" },
  { value: "48", label: "48h" },
  { value: "168", label: "7d" },
];

interface Props {
  value: TimeRange;
  onChange: (v: TimeRange) => void;
}

export function TimeRangeSelector({ value, onChange }: Props) {
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
