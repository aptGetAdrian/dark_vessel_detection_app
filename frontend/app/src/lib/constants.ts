export const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080";

export const POLL_INTERVAL_MS = 30_000;

// AIS protocol sentinel values indicating data unavailability
export const AIS_HEADING_UNAVAILABLE = 511;
export const AIS_COG_UNAVAILABLE = 360.0;
export const AIS_SOG_UNAVAILABLE = 102.4;

// Detection score thresholds
export const RISK_CRITICAL_THRESHOLD = 60;
export const CONFIDENCE_LOW_THRESHOLD = 60;
export const CONFIDENCE_HIGH_THRESHOLD = 90;
export const CONFIDENCE_MED_THRESHOLD = 75;

// Map defaults
export const DEFAULT_MAP_CENTER = { latitude: 55, longitude: 10, zoom: 3 } as const;
export const MAPBOX_DARK_STYLE = "mapbox://styles/mapbox/dark-v11";

// Static until real geographic coverage data is available
export const COVERAGE_AREA = "2840K km²";
