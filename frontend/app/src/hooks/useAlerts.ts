import { useState, useEffect } from "react";
import { API_BASE, POLL_INTERVAL_MS } from "@/lib/constants";

export interface Alert {
  id: number;
  mmsi: number;
  vessel_name: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  reason: string;
  confidence: number;
  lat: number;
  lon: number;
  status: string;
  created_at: string;
}

export function useAlerts(limit = 500) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetch_() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/alerts?limit=${limit}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setAlerts(Array.isArray(data) ? data : []);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetch_();
    const id = setInterval(fetch_, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [limit]);

  return { alerts, isLoading };
}
