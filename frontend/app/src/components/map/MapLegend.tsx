import { useState, type ReactNode } from "react";
import { Layers } from "lucide-react";

interface MapLegendProps {
  showSatellite: boolean;
}

function MiniArrow({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 20 24" width="10" height="12" className={className} fill="currentColor">
      <path d="M10 1 L17 21 L10 16 L3 21 Z" />
    </svg>
  );
}

interface LegendEntry {
  label: string;
  sublabel: string;
  shape?: string;
  icon?: ReactNode;
}

const VESSEL_ENTRIES: LegendEntry[] = [
  {
    label: "Active vessel",
    sublabel: "AIS broadcasting",
    icon: <MiniArrow className="text-status-info" />,
  },
  {
    label: "Dark vessel",
    sublabel: "AIS silent >6h",
    icon: <MiniArrow className="text-status-alert" />,
  },
  {
    label: "No heading",
    sublabel: "Course unknown",
    shape: "rounded-full bg-status-info",
  },
  {
    label: "Cluster",
    sublabel: "Grouped vessels",
    icon: (
      <svg viewBox="0 0 16 16" width="14" height="14">
        <circle cx="8" cy="8" r="7" fill="#355872" stroke="#0f141a" strokeWidth="1.2" />
        <text x="8" y="11" textAnchor="middle" fill="#f7f8f0" fontSize="8" fontWeight="600">n</text>
      </svg>
    ),
  },
  {
    label: "Vessel track",
    sublabel: "Position history",
    icon: (
      <svg viewBox="0 0 20 4" width="14" height="4" className="text-status-info">
        <line x1="0" y1="2" x2="20" y2="2" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
      </svg>
    ),
  },
];

const SATELLITE_ENTRIES: LegendEntry[] = [
  {
    label: "SAR unmatched",
    sublabel: "Dark candidate",
    shape: "rotate-45 bg-status-warning",
  },
  {
    label: "SAR matched",
    sublabel: "Identified",
    shape: "rotate-45 bg-bg-surface border border-border-subtle",
  },
];

export function MapLegend({ showSatellite }: MapLegendProps) {
  const [collapsed, setCollapsed] = useState(false);

  const entries = showSatellite
    ? [...VESSEL_ENTRIES, ...SATELLITE_ENTRIES]
    : VESSEL_ENTRIES;

  return (
    <div className="absolute top-3 left-3 z-10">
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className="flex size-8 items-center justify-center rounded-lg border border-border-subtle bg-bg-panel/90 text-text-muted shadow-lg backdrop-blur-sm transition-colors hover:text-text-primary"
          aria-label="Show map legend"
        >
          <Layers className="size-3.5" />
        </button>
      ) : (
        <div className="rounded-lg border border-border-subtle bg-bg-panel/90 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4 px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Legend
            </span>
            <button
              onClick={() => setCollapsed(true)}
              className="text-[10px] text-text-muted transition-colors hover:text-text-primary"
              aria-label="Collapse legend"
            >
              Hide
            </button>
          </div>
          <div className="flex flex-col gap-1.5 px-3 pb-2.5">
            {entries.map((entry) => (
              <div key={entry.label} className="flex items-center gap-2.5">
                {entry.icon ?? (
                  <span
                    className={`block size-2.5 shrink-0 border border-bg-ocean ${entry.shape}`}
                  />
                )}
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[11px] font-medium text-text-primary">
                    {entry.label}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {entry.sublabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
