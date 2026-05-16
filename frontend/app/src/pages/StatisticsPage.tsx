import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import { AlertTriangle, Radio, Satellite, Ship } from "lucide-react";
import { useAlerts } from "@/hooks/useAlerts";
import { useVessels } from "@/hooks/useVessels";
import { useSatelliteDetections } from "@/hooks/useSatelliteDetections";
import { EUScanAreas } from "@/lib/scanAreas";
import { KpiStripSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/Skeleton";

// ── helpers ────────────────────────────────────────────────────────────────────

function categoriseReason(reason: string): string {
  const r = reason.toLowerCase();
  if (r.includes("satellite") || r.includes("sar") || r.includes("no ais broadcast")) return "SAR Unmatched";
  if (r.includes("dark") || r.includes("silent") || r.includes("silence")) return "AIS Silence";
  if (r.includes("moored") || r.includes("navstat") || r.includes("sog")) return "NavStat Mismatch";
  if (r.includes("identity") || r.includes("imo") || r.includes("callsign")) return "Missing Identity";
  if (r.includes("impossible") || r.includes("travel") || r.includes("speed")) return "Impossible Travel";
  if (r.includes("heading") || r.includes("cog")) return "COG/Heading Delta";
  return "Other";
}

function regionForCoord(lat: number, lon: number): string {
  for (const area of EUScanAreas) {
    if (lat >= area.minLat && lat <= area.maxLat && lon >= area.minLon && lon <= area.maxLon) {
      return area.name;
    }
  }
  return "Other";
}

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: "#df6666",
  WARNING:  "#d4a24c",
  INFO:     "#7aaace",
};

const TYPE_COLORS = [
  "#7aaace", "#d4a24c", "#df6666", "#6abd8a", "#a07ace", "#c0c0c0",
];

// ── sub-components ─────────────────────────────────────────────────────────────

function KpiCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border-subtle bg-bg-panel px-5 py-4 shadow-panel">
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-2xl font-bold text-text-primary">{value}</p>
        {sub && <p className="text-xs text-text-muted">{sub}</p>}
      </div>
    </div>
  );
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-muted">
      {children}
    </p>
  );
}

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

// ── page ──────────────────────────────────────────────────────────────────────

export function StatisticsPage() {
  const { alerts, isLoading: alertsLoading } = useAlerts(500);
  const { vessels, darkVessels, isLoading: vesselsLoading } = useVessels();
  const { detections } = useSatelliteDetections("");

  const isLoading = alertsLoading || vesselsLoading;

  // Alert type breakdown
  const typeCounts = alerts.reduce<Record<string, number>>((acc, a) => {
    const cat = categoriseReason(a.reason);
    acc[cat] = (acc[cat] ?? 0) + 1;
    return acc;
  }, {});
  const typeData = Object.entries(typeCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Severity breakdown
  const severityCounts = alerts.reduce<Record<string, number>>((acc, a) => {
    acc[a.severity] = (acc[a.severity] ?? 0) + 1;
    return acc;
  }, {});
  const severityData = ["CRITICAL", "WARNING", "INFO"]
    .filter((s) => severityCounts[s])
    .map((s) => ({ name: s, value: severityCounts[s] }));

  // Dark vessels by sea region
  const regionCounts = darkVessels.reduce<Record<string, number>>((acc, v) => {
    const r = regionForCoord(v.lat, v.lon);
    acc[r] = (acc[r] ?? 0) + 1;
    return acc;
  }, {});
  const regionData = Object.entries(regionCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // SAR stats
  const unmatchedCount = detections.filter((d) => d.matched_mmsi == null).length;
  const matchedCount = detections.length - unmatchedCount;
  const matchRate = detections.length
    ? Math.round((matchedCount / detections.length) * 100)
    : null;

  // Vessel type breakdown among dark vessels
  const vesselTypeCounts = darkVessels.reduce<Record<string, number>>((acc, v) => {
    const t = v.type_name || "Unknown";
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});
  const vesselTypeData = Object.entries(vesselTypeCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  if (isLoading) {
    return (
      <section className="min-h-[calc(100vh-3.75rem)] bg-bg-ocean px-6 py-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <KpiStripSkeleton />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
          <TableSkeleton />
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[calc(100vh-3.75rem)] bg-bg-ocean px-6 py-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            icon={<Ship className="size-5 text-status-info" />}
            label="Vessels tracked"
            value={vessels.length}
            color="bg-status-info/10"
          />
          <KpiCard
            icon={<Radio className="size-5 text-status-alert" />}
            label="Dark vessels"
            value={darkVessels.length}
            sub={vessels.length ? `${Math.round((darkVessels.length / vessels.length) * 100)}% of fleet` : undefined}
            color="bg-status-alert/10"
          />
          <KpiCard
            icon={<AlertTriangle className="size-5 text-status-warning" />}
            label="Active alerts"
            value={alerts.filter((a) => a.status === "NEW").length}
            sub={`${alerts.filter((a) => a.severity === "CRITICAL").length} critical`}
            color="bg-status-warning/10"
          />
          <KpiCard
            icon={<Satellite className="size-5 text-status-warning" />}
            label="SAR unmatched"
            value={unmatchedCount}
            sub={matchRate != null ? `${matchRate}% match rate` : undefined}
            color="bg-status-warning/10"
          />
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

          {/* Alert type breakdown */}
          <div className="rounded-xl border border-border-subtle bg-bg-panel p-5 shadow-panel">
            <PanelTitle>Alert breakdown by type</PanelTitle>
            {typeData.length === 0 ? (
              <p className="text-sm text-text-muted">No alerts recorded yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={typeData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" tick={{ fill: "#6b7a8d", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#b9c2c9", fontSize: 11 }} width={130} axisLine={false} tickLine={false} />
                  <Tooltip {...chartTooltipStyle} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {typeData.map((_, i) => (
                      <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Severity distribution */}
          <div className="rounded-xl border border-border-subtle bg-bg-panel p-5 shadow-panel">
            <PanelTitle>Alert severity distribution</PanelTitle>
            {severityData.length === 0 ? (
              <p className="text-sm text-text-muted">No alerts recorded yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={severityData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {severityData.map((entry, i) => (
                      <Cell key={i} fill={SEVERITY_COLOR[entry.name] ?? "#6b7a8d"} />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: "#b9c2c9", fontSize: 12 }}>{value}</span>
                    )}
                  />
                  <Tooltip {...chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

          {/* Dark vessels by region */}
          <div className="rounded-xl border border-border-subtle bg-bg-panel p-5 shadow-panel">
            <PanelTitle>Dark vessels by sea region</PanelTitle>
            {regionData.length === 0 ? (
              <p className="text-sm text-text-muted">No dark vessels detected.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={regionData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" tick={{ fill: "#6b7a8d", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#b9c2c9", fontSize: 11 }} width={150} axisLine={false} tickLine={false} />
                  <Tooltip {...chartTooltipStyle} />
                  <Bar dataKey="count" fill="#df6666" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Dark vessel type breakdown */}
          <div className="rounded-xl border border-border-subtle bg-bg-panel p-5 shadow-panel">
            <PanelTitle>Dark vessels by vessel type</PanelTitle>
            {vesselTypeData.length === 0 ? (
              <p className="text-sm text-text-muted">No dark vessels detected.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={vesselTypeData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" tick={{ fill: "#6b7a8d", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#b9c2c9", fontSize: 11 }} width={130} axisLine={false} tickLine={false} />
                  <Tooltip {...chartTooltipStyle} />
                  <Bar dataKey="count" fill="#d4a24c" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent alerts table */}
        <div className="rounded-xl border border-border-subtle bg-bg-panel p-5 shadow-panel">
          <PanelTitle>Recent alerts ({alerts.length})</PanelTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-subtle text-left text-text-muted">
                  <th className="pb-2 pr-4 font-medium">Severity</th>
                  <th className="pb-2 pr-4 font-medium">Vessel</th>
                  <th className="pb-2 pr-4 font-medium">Reason</th>
                  <th className="pb-2 pr-4 font-medium">Confidence</th>
                  <th className="pb-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {alerts.slice(0, 50).map((a) => (
                  <tr key={a.id} className="border-b border-border-subtle/40 hover:bg-bg-surface/40">
                    <td className="py-2 pr-4">
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                        style={{
                          background: `${SEVERITY_COLOR[a.severity]}22`,
                          color: SEVERITY_COLOR[a.severity],
                        }}
                      >
                        {a.severity}
                      </span>
                    </td>
                    <td className="py-2 pr-4 font-medium text-text-primary">{a.vessel_name}</td>
                    <td className="max-w-xs truncate py-2 pr-4 text-text-muted">{a.reason}</td>
                    <td className="py-2 pr-4 text-text-muted">{a.confidence}%</td>
                    <td className="py-2 text-text-muted">
                      {new Date(a.created_at).toLocaleString(undefined, {
                        month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </section>
  );
}
