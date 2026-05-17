import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { ZoneStats, ZoneMetric } from "@/types/analytics";

const chartTooltipStyle = {
  contentStyle: {
    background: "#1a2330",
    border: "1px solid #2a3442",
    borderRadius: 8,
    fontSize: 12,
    color: "#f7f8f0",
  },
  cursor: { fill: "rgba(255,255,255,0.04)" },
};

const METRIC_LABELS: Record<ZoneMetric, string> = {
  detections: "Total Detections",
  dark_vessels: "Dark Vessels",
  alerts: "Alerts",
  match_rate: "Match Rate (%)",
};

function getDataKey(metric: ZoneMetric) {
  return metric === "match_rate" ? "match_pct" : metric === "detections" ? "total_detections" : metric;
}

interface Props {
  zones: ZoneStats[];
  metric: ZoneMetric;
  selectedZone: string | null;
  onSelectZone: (name: string) => void;
}

export function ZoneRankedBars({ zones, metric, selectedZone, onSelectZone }: Props) {
  const sorted = [...zones]
    .map((z) => ({
      ...z,
      match_pct: Math.round(z.match_rate * 100),
    }))
    .sort((a, b) => {
      const key = getDataKey(metric);
      return (b[key as keyof typeof b] as number) - (a[key as keyof typeof a] as number);
    })
    .slice(0, 12);

  const dataKey = getDataKey(metric);

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-panel p-5 shadow-panel">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-muted">
        {METRIC_LABELS[metric]} by Zone
      </p>
      {sorted.length === 0 ? (
        <p className="text-sm text-text-muted">No data available.</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(240, sorted.length * 28)}>
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ left: 8, right: 24 }}
            onClick={(e: Record<string, unknown>) => {
              const payload = e?.activePayload as { payload: { name: string } }[] | undefined;
              if (payload?.[0]?.payload?.name) {
                onSelectZone(payload[0].payload.name);
              }
            }}
          >
            <XAxis
              type="number"
              tick={{ fill: "#6b7a8d", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: "#b9c2c9", fontSize: 11 }}
              width={160}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip {...chartTooltipStyle} />
            <Bar dataKey={dataKey} radius={[0, 4, 4, 0]} cursor="pointer">
              {sorted.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={entry.name === selectedZone ? "#7aaace" : "#4a6a8a"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
