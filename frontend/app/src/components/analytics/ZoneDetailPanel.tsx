import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { ZoneDetail } from "@/types/analytics";
import { SEVERITY_COLOR, TYPE_COLORS, chartTooltipStyle } from "@/lib/chartTheme";

interface Props {
  detail: ZoneDetail;
  isLoading: boolean;
}

export function ZoneDetailPanel({ detail, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="animate-pulse rounded-xl border border-border-subtle bg-bg-panel p-5 shadow-panel">
        <div className="h-4 w-48 rounded bg-bg-surface" />
        <div className="mt-4 grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 rounded bg-bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Quick stats */}
      <div className="rounded-xl border border-border-subtle bg-bg-panel p-5 shadow-panel">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-text-muted">
          {detail.name} — Summary
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatBox label="Detections" value={detail.total_detections} />
          <StatBox label="Matched" value={detail.matched_count} />
          <StatBox label="Unmatched" value={detail.unmatched_count} />
          <StatBox label="Dark Vessels" value={detail.dark_vessels} />
          <StatBox label="Alerts" value={detail.alert_count} />
          <StatBox label="Avg Risk" value={Math.round(detail.avg_risk_score)} />
        </div>
      </div>

      {/* Vessel type breakdown */}
      {detail.vessel_type_breakdown?.length > 0 && (
        <div className="rounded-xl border border-border-subtle bg-bg-panel p-5 shadow-panel">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Vessel Types in Zone
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={detail.vessel_type_breakdown} layout="vertical" margin={{ left: 4, right: 16 }}>
              <XAxis type="number" tick={{ fill: "#6b7a8d", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#b9c2c9", fontSize: 10 }} width={80} axisLine={false} tickLine={false} />
              <Tooltip {...chartTooltipStyle} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {detail.vessel_type_breakdown.map((_, i) => (
                  <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Alert severity badges */}
      {detail.alert_severity_breakdown?.length > 0 && (
        <div className="rounded-xl border border-border-subtle bg-bg-panel p-5 shadow-panel">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Alert Severity
          </p>
          <div className="flex flex-wrap gap-2">
            {detail.alert_severity_breakdown.map((s) => (
              <span
                key={s.name}
                className="rounded-md px-3 py-1.5 text-xs font-bold"
                style={{
                  background: `${SEVERITY_COLOR[s.name] ?? "#6b7a8d"}22`,
                  color: SEVERITY_COLOR[s.name] ?? "#6b7a8d",
                }}
              >
                {s.name}: {s.count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent alerts */}
      {detail.recent_alerts?.length > 0 && (
        <div className="rounded-xl border border-border-subtle bg-bg-panel p-5 shadow-panel">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Recent Alerts
          </p>
          <div className="space-y-2">
            {detail.recent_alerts.slice(0, 5).map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-lg border border-border-subtle/40 px-3 py-2"
              >
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                  style={{
                    background: `${SEVERITY_COLOR[a.severity]}22`,
                    color: SEVERITY_COLOR[a.severity],
                  }}
                >
                  {a.severity}
                </span>
                <span className="text-xs font-medium text-text-primary">{a.vessel_name}</span>
                <span className="flex-1 truncate text-xs text-text-muted">{a.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border-subtle/40 bg-bg-surface/50 px-3 py-2">
      <p className="text-[10px] text-text-muted">{label}</p>
      <p className="text-lg font-bold text-text-primary">{value}</p>
    </div>
  );
}
