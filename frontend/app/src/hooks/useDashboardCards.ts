import { useState, useEffect, useCallback, useRef } from "react";
import { AlertTriangle, Activity, Map as MapIcon, Ship } from "lucide-react";
import type { DashboardCard, Vessel } from "@/types/dashboard";
import { fetchJSON } from "@/lib/api";
import { POLL_INTERVAL_MS, COVERAGE_AREA } from "@/lib/constants";

function buildCards(
  darkCount: number,
  totalCount: number,
  updatedAt: Date,
  prevValues: Map<string, number>,
): DashboardCard[] {
  const entries: { id: string; title: string; value: string | number; icon: typeof AlertTriangle; iconClass: string; iconBgClass: string }[] = [
    {
      id: "active-vessels",
      title: "Active Dark Vessels",
      value: darkCount,
      icon: AlertTriangle,
      iconClass: "text-status-alert",
      iconBgClass: "bg-status-alert/12",
    },
    {
      id: "high-severity",
      title: "High Severity Alerts",
      value: darkCount,
      icon: Activity,
      iconClass: "text-status-warning",
      iconBgClass: "bg-status-warning/12",
    },
    {
      id: "coverage",
      title: "Coverage Area",
      value: COVERAGE_AREA,
      icon: MapIcon,
      iconClass: "text-status-info",
      iconBgClass: "bg-status-info/14",
    },
    {
      id: "vessels-tracked",
      title: "Vessels Tracked",
      value: totalCount,
      icon: Ship,
      iconClass: "text-accent",
      iconBgClass: "bg-accent-soft",
    },
  ];

  return entries.map((entry) => {
    const numericValue = typeof entry.value === "number" ? entry.value : null;
    const prev = prevValues.get(entry.id) ?? null;
    const delta = numericValue != null && prev != null ? numericValue - prev : null;

    return {
      ...entry,
      updatedAt,
      delta,
      previousValue: prev,
    };
  });
}

interface UseDashboardCardsResult {
  cards: DashboardCard[];
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useDashboardCards(): UseDashboardCardsResult {
  const [cards, setCards] = useState<DashboardCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const prevValuesRef = useRef<Map<string, number>>(new Map());

  const fetchAll = useCallback(async () => {
    try {
      const [allVessels, darkVessels] = await Promise.all([
        fetchJSON<Vessel[]>("/api/v1/vessels"),
        fetchJSON<Vessel[]>("/api/v1/vessels/dark"),
      ]);
      const now = new Date();
      const newCards = buildCards(
        darkVessels.length,
        allVessels.length,
        now,
        prevValuesRef.current,
      );
      setCards(newCards);
      setLastUpdated(now);
      setError(null);

      const nextPrev = new Map<string, number>();
      for (const card of newCards) {
        if (typeof card.value === "number") {
          nextPrev.set(card.id, card.value);
        }
      }
      prevValuesRef.current = nextPrev;
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

  return { cards, isLoading, error, lastUpdated, refresh: fetchAll };
}
