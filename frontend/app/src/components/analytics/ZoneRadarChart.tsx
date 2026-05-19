import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";
import type { ZoneStats, ZoneDetail } from "@/types/analytics";
import { chartTooltipStyle } from "@/lib/chartTheme";

interface Props {
  detail: ZoneDetail | null;
  allZones: ZoneStats[];
}

export function ZoneRadarChart({ detail, allZones }: Props) {
  if (!detail) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-xl border border-border-subtle bg-bg-panel shadow-panel">
        <p className="text-sm text-text-muted">Select a zone to see its profile</p>
      </div>
    );
  }

  const maxDetections = Math.max(1, ...allZones.map((z) => z.total_detections));
  const maxDark = Math.max(1, ...allZones.map((z) => z.dark_vessels));
  const maxAlerts = Math.max(1, ...allZones.map((z) => z.alert_count));
  const maxRisk = Math.max(1, ...allZones.map((z) => z.avg_risk_score));

  const data = [
    { axis: "Detections", value: Math.round((detail.total_detections / maxDetections) * 100) },
    { axis: "Dark Vessels", value: Math.round((detail.dark_vessels / maxDark) * 100) },
    { axis: "Alerts", value: Math.round((detail.alert_count / maxAlerts) * 100) },
    { axis: "Match Rate", value: Math.round(detail.match_rate * 100) },
    { axis: "Risk Score", value: Math.round((detail.avg_risk_score / maxRisk) * 100) },
  ];

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-panel p-5 shadow-panel">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        Zone Profile — {detail.name}
      </p>
      <ResponsiveContainer width="100%" height={250}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#2a3442" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: "#b9c2c9", fontSize: 11 }}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={{ fill: "#6b7a8d", fontSize: 9 }}
            axisLine={false}
          />
          <Radar
            dataKey="value"
            stroke="#7aaace"
            fill="#7aaace"
            fillOpacity={0.3}
          />
          <Tooltip {...chartTooltipStyle} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
