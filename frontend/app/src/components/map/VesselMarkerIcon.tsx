import { AIS_HEADING_UNAVAILABLE, AIS_COG_UNAVAILABLE } from "@/lib/constants";

interface VesselMarkerIconProps {
  cog: number;
  heading: number;
  isDark: boolean;
  isSelected?: boolean;
}

export function VesselMarkerIcon({
  cog,
  heading,
  isDark,
  isSelected = false,
}: VesselMarkerIconProps) {
  const hasDirection =
    !(heading === AIS_HEADING_UNAVAILABLE && (cog === AIS_COG_UNAVAILABLE || cog === 0));

  const colorClass = isDark ? "text-status-alert" : "text-status-info";

  return (
    <div
      className={`relative flex cursor-pointer items-center justify-center transition-transform hover:scale-125 ${
        isSelected ? "scale-125" : ""
      }`}
    >
      {isDark && (
        <span className="absolute size-7 rounded-full bg-status-alert/40 animate-pulse-ring" />
      )}

      {hasDirection ? (
        <svg
          viewBox="0 0 20 24"
          width="18"
          height="22"
          className={colorClass}
          fill="currentColor"
          style={{ transform: `rotate(${cog}deg)`, transformOrigin: "center" }}
        >
          <path
            d="M10 1 L17 21 L10 16 L3 21 Z"
            stroke="#0f141a"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 14 14"
          width="14"
          height="14"
          className={colorClass}
          fill="currentColor"
        >
          <circle cx="7" cy="7" r="5.5" stroke="#0f141a" strokeWidth="1.2" />
        </svg>
      )}
    </div>
  );
}
