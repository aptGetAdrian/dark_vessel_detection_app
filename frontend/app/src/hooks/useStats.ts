import { useState, useEffect } from "react";
import { fetchJSON } from "@/lib/api";
import { POLL_INTERVAL_MS } from "@/lib/constants";

export interface Stats {
  total_vessels: number;
  dark_vessels: number;
  active_alerts: number;
  critical_alerts: number;
  last_updated: string;
}

export function useStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchJSON<Stats>("/api/v1/stats");
        if (!cancelled) setStats(data);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return { stats, isLoading };
}
