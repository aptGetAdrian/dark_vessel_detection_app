import { useState, useCallback } from "react";
import { Globe, Target, ShieldAlert, Radar } from "lucide-react";
import { useZoneAnalytics } from "@/hooks/useZoneAnalytics";
import { TimeRangeSelector } from "@/components/analytics/TimeRangeSelector";
import { MetricSelector } from "@/components/analytics/MetricSelector";
import { ZoneReferenceMap } from "@/components/analytics/ZoneReferenceMap";
import { ZoneRankedBars } from "@/components/analytics/ZoneRankedBars";
import { ZoneRadarChart } from "@/components/analytics/ZoneRadarChart";
import { ZoneDetailPanel } from "@/components/analytics/ZoneDetailPanel";
import { KpiStripSkeleton, ChartSkeleton } from "@/components/ui/Skeleton";
import { KpiCard } from "@/components/ui/KpiCard";
import type { ZoneMetric, TimeRange } from "@/types/analytics";

export function ZoneAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("48");
  const [metric, setMetric] = useState<ZoneMetric>("detections");
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const {
    zones,
    overview,
    selectedZoneDetail,
    isLoading,
    isDetailLoading,
    fetchDetail,
  } = useZoneAnalytics(timeRange);

  const handleSelectZone = useCallback(
    (name: string) => {
      setSelectedZone(name);
      fetchDetail(name);
    },
    [fetchDetail]
  );

  if (isLoading) {
    return (
      <section className="min-h-[calc(100vh-3.5rem)] bg-bg-ocean px-6 py-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <KpiStripSkeleton />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[calc(100vh-3.5rem)] bg-bg-ocean px-6 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-text-primary">Zone Analytics</h1>
          <div className="flex items-center gap-3">
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
            <MetricSelector value={metric} onChange={setMetric} />
          </div>
        </div>

        {/* KPI strip */}
        {overview && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              icon={<Radar className="size-5 text-status-info" />}
              label="Total Detections"
              value={overview.total_detections}
              sub={`${overview.zones_covered} zones active`}
              color="bg-status-info/10"
            />
            <KpiCard
              icon={<Target className="size-5 text-status-safe" />}
              label="Match Rate"
              value={`${Math.round(overview.overall_match_rate * 100)}%`}
              sub="AIS-confirmed"
              color="bg-status-safe/10"
            />
            <KpiCard
              icon={<ShieldAlert className="size-5 text-status-alert" />}
              label="Highest Risk"
              value={overview.highest_risk_zone || "—"}
              sub={`${overview.total_dark_vessels} dark vessels`}
              color="bg-status-alert/10"
            />
            <KpiCard
              icon={<Globe className="size-5 text-status-warning" />}
              label="Active Alerts"
              value={overview.total_alerts}
              sub="across all zones"
              color="bg-status-warning/10"
            />
          </div>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Left column: Map + Radar */}
          <div className="space-y-5">
            <ZoneReferenceMap
              zones={zones}
              metric={metric}
              selectedZone={selectedZone}
              onSelectZone={handleSelectZone}
            />
            <ZoneRadarChart detail={selectedZoneDetail} allZones={zones} />
          </div>

          {/* Right column: Bars + Detail */}
          <div className="space-y-5">
            <ZoneRankedBars
              zones={zones}
              metric={metric}
              selectedZone={selectedZone}
              onSelectZone={handleSelectZone}
            />
            {selectedZoneDetail && (
              <ZoneDetailPanel detail={selectedZoneDetail} isLoading={isDetailLoading} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
