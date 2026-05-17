import { useState, useEffect, useCallback } from "react";
import { fetchJSON } from "@/lib/api";
import type {
  ZoneStats,
  ZoneDetail,
  AnalyticsOverview,
  TimeRange,
} from "@/types/analytics";

interface UseZoneAnalyticsResult {
  zones: ZoneStats[];
  overview: AnalyticsOverview | null;
  selectedZoneDetail: ZoneDetail | null;
  isLoading: boolean;
  isDetailLoading: boolean;
  error: Error | null;
  fetchDetail: (area: string) => void;
}

export function useZoneAnalytics(timeRange: TimeRange): UseZoneAnalyticsResult {
  const [zones, setZones] = useState<ZoneStats[]>([]);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [selectedZoneDetail, setSelectedZoneDetail] =
    useState<ZoneDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const [z, o] = await Promise.all([
          fetchJSON<ZoneStats[]>(`/api/v1/analytics/zones?hours=${timeRange}`),
          fetchJSON<AnalyticsOverview>(
            `/api/v1/analytics/overview?hours=${timeRange}`
          ),
        ]);
        if (!cancelled) {
          setZones(z);
          setOverview(o);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err : new Error("Failed to fetch analytics")
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [timeRange]);

  const fetchDetail = useCallback(
    async (area: string) => {
      setIsDetailLoading(true);
      try {
        const detail = await fetchJSON<ZoneDetail>(
          `/api/v1/analytics/zones/${encodeURIComponent(area)}?hours=${timeRange}`
        );
        setSelectedZoneDetail(detail);
      } catch {
        setSelectedZoneDetail(null);
      } finally {
        setIsDetailLoading(false);
      }
    },
    [timeRange]
  );

  return {
    zones,
    overview,
    selectedZoneDetail,
    isLoading,
    isDetailLoading,
    error,
    fetchDetail,
  };
}
