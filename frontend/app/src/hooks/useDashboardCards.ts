import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Activity, Map as MapIcon, Ship } from "lucide-react";
import type { DashboardCard, Vessel } from "@/types/dashboard";
import { fetchJSON } from "@/lib/api";
import { POLL_INTERVAL_MS, COVERAGE_AREA } from "@/lib/constants";

const SNAPSHOT_KEY = "dv_card_snapshot";
const SNAPSHOT_MIN_AGE_MS = 5 * 60_000;

interface Snapshot {
  values: Record<string, number>;
  ts: number;
}

function loadSnapshot(): Snapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Snapshot;
  } catch {
    return null;
  }
}

function saveSnapshot(values: Record<string, number>) {
  const snap: Snapshot = { values, ts: Date.now() };
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap));
}

function buildCards(
  darkCount: number,
  totalCount: number,
  updatedAt: Date,
  baseline: Record<string, number> | null,
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
    const prev = baseline?.[entry.id] ?? null;
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

  const fetchAll = useCallback(async () => {
    try {
      const [allVessels, darkVessels] = await Promise.all([
        fetchJSON<Vessel[]>("/api/v1/vessels"),
        fetchJSON<Vessel[]>("/api/v1/vessels/dark"),
      ]);

      const now = new Date();
      const currentValues: Record<string, number> = {
        "active-vessels": darkVessels.length,
        "high-severity": darkVessels.length,
        "vessels-tracked": allVessels.length,
      };

      const snap = loadSnapshot();
      const snapshotIsStale = !snap || (Date.now() - snap.ts) >= SNAPSHOT_MIN_AGE_MS;

      const baseline = snap?.values ?? null;
      const newCards = buildCards(darkVessels.length, allVessels.length, now, baseline);

      setCards(newCards);
      setLastUpdated(now);
      setError(null);

      if (snapshotIsStale) {
        saveSnapshot(currentValues);
      }
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
