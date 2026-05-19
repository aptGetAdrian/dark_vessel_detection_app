import { useState, useEffect, useCallback } from "react";
import type { Vessel } from "@/types/dashboard";
import { fetchJSON } from "@/lib/api";
import { POLL_INTERVAL_MS } from "@/lib/constants";

interface UseVesselsResult {
  vessels: Vessel[];
  darkVessels: Vessel[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useVessels(): UseVesselsResult {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [darkVessels, setDarkVessels] = useState<Vessel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [all, dark] = await Promise.all([
        fetchJSON<Vessel[] | null>("/api/v1/vessels"),
        fetchJSON<Vessel[] | null>("/api/v1/vessels/dark"),
      ]);
      setVessels(all ?? []);
      setDarkVessels(dark ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch vessels"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return { vessels, darkVessels, isLoading, error, refresh: fetchAll };
}
