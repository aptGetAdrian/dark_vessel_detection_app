import { useState, useEffect } from "react";
import type { TrackPosition } from "@/types/dashboard";
import { fetchJSON } from "@/lib/api";

interface UseVesselTrackResult {
  positions: TrackPosition[];
  isLoading: boolean;
  error: Error | null;
}

export function useVesselTrack(mmsi: number | null): UseVesselTrackResult {
  const [positions, setPositions] = useState<TrackPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (mmsi == null) {
      setPositions([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setPositions([]);
    setIsLoading(true);
    setError(null);

    fetchJSON<TrackPosition[]>(`/api/v1/vessels/${mmsi}/track`)
      .then((data) => {
        if (!cancelled) setPositions(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error("Failed to fetch track"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mmsi]);

  return { positions, isLoading, error };
}
