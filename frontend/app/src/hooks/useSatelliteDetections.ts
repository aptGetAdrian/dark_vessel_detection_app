import { useState, useEffect, useCallback } from "react";
import type { SatelliteDetection } from "@/types/dashboard";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080";
const POLL_INTERVAL_MS = 60_000;

interface UseSatelliteDetectionsResult {
  detections: SatelliteDetection[];
  scanAreas: string[];
  isLoading: boolean;
  error: Error | null;
}

export function useSatelliteDetections(selectedArea: string): UseSatelliteDetectionsResult {
  const [detections, setDetections] = useState<SatelliteDetection[]>([]);
  const [scanAreas, setScanAreas] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/satellite/areas`)
      .then((r) => r.json())
      .then((d) => setScanAreas(d as string[]))
      .catch(() => {});
  }, []);

  const fetchDetections = useCallback(async () => {
    try {
      const params = new URLSearchParams({ hours: "48" });
      if (selectedArea) params.set("area", selectedArea);
      const res = await fetch(`${API_BASE}/api/v1/satellite/detections?${params}`);
      if (!res.ok) throw new Error(`satellite/detections returned ${res.status}`);
      setDetections(await res.json() as SatelliteDetection[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch satellite detections"));
    } finally {
      setIsLoading(false);
    }
  }, [selectedArea]);

  useEffect(() => {
    fetchDetections();
    const interval = setInterval(fetchDetections, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchDetections]);

  return { detections, scanAreas, isLoading, error };
}
