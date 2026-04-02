import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Activity, Map as MapIcon, Ship } from "lucide-react";
import type { DashboardCard } from "@/types/dashboard";

const POLL_INTERVAL_MS = 30_000;

// Replace these fetchers with real API calls when your backend is ready.
// Each function should return the resolved value for its card.
async function fetchActiveVessels(): Promise<string> {
  // e.g. const res = await fetch("/api/vessels/active"); return (await res.json()).count;
  return "4";
}

async function fetchHighSeverityAlerts(): Promise<string> {
  return "4";
}

async function fetchCoverageArea(): Promise<string> {
  return "2840K km²";
}

async function fetchVesselsTracked(): Promise<string> {
  return "1,248";
}

function buildCards(
  values: [string, string, string, string],
  updatedAt: Date,
): DashboardCard[] {
  const [activeVessels, highSeverity, coverage, vesselsTracked] = values;

  return [
    {
      id: "active-vessels",
      title: "Active Dark Vessels",
      value: activeVessels,
      icon: AlertTriangle,
      iconClass: "text-status-alert",
      iconBgClass: "bg-status-alert/12",
      updatedAt,
    },
    {
      id: "high-severity",
      title: "High Severity Alerts",
      value: highSeverity,
      icon: Activity,
      iconClass: "text-status-warning",
      iconBgClass: "bg-status-warning/12",
      updatedAt,
    },
    {
      id: "coverage",
      title: "Coverage Area",
      value: coverage,
      icon: MapIcon,
      iconClass: "text-status-info",
      iconBgClass: "bg-status-info/14",
      updatedAt,
    },
    {
      id: "vessels-tracked",
      title: "Vessels Tracked",
      value: vesselsTracked,
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
      const values = await Promise.all([
        fetchActiveVessels(),
        fetchHighSeverityAlerts(),
        fetchCoverageArea(),
        fetchVesselsTracked(),
      ]);

      setCards(buildCards(values, new Date()));
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
