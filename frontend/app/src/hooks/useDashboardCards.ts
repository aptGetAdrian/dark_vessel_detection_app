import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Activity, Map as MapIcon, Ship } from "lucide-react";
import type { DashboardCard, Vessel } from "@/types/dashboard";
import { fetchJSON } from "@/lib/api";
import { POLL_INTERVAL_MS, COVERAGE_AREA } from "@/lib/constants";

function buildCards(
  darkCount: number,
  totalCount: number,
  updatedAt: Date,
): DashboardCard[] {
  return [
    {
      id: "active-vessels",
      title: "Active Dark Vessels",
      value: darkCount,
      icon: AlertTriangle,
      iconClass: "text-status-alert",
      iconBgClass: "bg-status-alert/12",
      updatedAt,
    },
    {
      id: "high-severity",
      title: "High Severity Alerts",
      value: darkCount,
      icon: Activity,
      iconClass: "text-status-warning",
      iconBgClass: "bg-status-warning/12",
      updatedAt,
    },
    {
      id: "coverage",
      title: "Coverage Area",
      value: COVERAGE_AREA,
      icon: MapIcon,
      iconClass: "text-status-info",
      iconBgClass: "bg-status-info/14",
      updatedAt,
    },
    {
      id: "vessels-tracked",
      title: "Vessels Tracked",
      value: totalCount,
      icon: Ship,
      iconClass: "text-accent",
      iconBgClass: "bg-accent-soft",
      updatedAt,
    },
  ];
}

interface UseDashboardCardsResult {
  cards: DashboardCard[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useDashboardCards(): UseDashboardCardsResult {
  const [cards, setCards] = useState<DashboardCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [allVessels, darkVessels] = await Promise.all([
        fetchJSON<Vessel[]>("/api/v1/vessels"),
        fetchJSON<Vessel[]>("/api/v1/vessels/dark"),
      ]);
      setCards(buildCards(darkVessels.length, allVessels.length, new Date()));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch cards"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return { cards, isLoading, error, refresh: fetchAll };
}
