import { useState, useEffect, useCallback } from "react";
import type { HealthStatus } from "@/types/dashboard";
import { fetchJSON } from "@/lib/api";

const HEALTH_POLL_MS = 60_000;

export function useHealthStatus() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const data = await fetchJSON<HealthStatus>("/api/v1/health");
      setHealth(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Health check failed"));
    }
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, HEALTH_POLL_MS);
    return () => clearInterval(id);
  }, [fetch_]);

  return { health, error };
}
