import { useState } from "react";
import Map, {
  Marker,
  NavigationControl,
  ScaleControl,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { StatCard } from "@/components/ui/statCard";
import { useDashboardCards } from "@/hooks/Usedashboardcards";
import { useVessels } from "@/hooks/useVessels";
import { RecentAlerts } from "@/components/ui/RecentAlerts";
import { VesselPopup } from "@/components/map/VesselPopup";
import type { VesselAlert, Vessel } from "@/types/dashboard";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as
  | string
  | undefined;

function darkVesselToAlert(vessel: Vessel, index: number): VesselAlert {
  const hoursOffline =
    (Date.now() - new Date(vessel.last_ais).getTime()) / 3_600_000;

  const severity: VesselAlert["severity"] =
    hoursOffline >= 24 ? "CRITICAL" : "WARNING";

  return {
    id: `ALT-${String(index + 1).padStart(3, "0")}`,
    severity,
    status: "NEW",
    vesselName: vessel.name,
    description: `AIS signal lost for ${Math.floor(hoursOffline)}h. MMSI: ${vessel.mmsi}`,
    location: `${vessel.lat.toFixed(2)}°N, ${vessel.lon.toFixed(2)}°E`,
    timestamp: new Date(vessel.last_ais),
    confidence: hoursOffline >= 24 ? 92 : 78,
  };
}

export function InteractiveMap() {
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);

  const {
    cards,
    isLoading: cardsLoading,
    error: cardsError,
  } = useDashboardCards();
  const {
    vessels,
    darkVessels,
    isLoading: vesselsLoading,
    error: vesselsError,
  } = useVessels();

  const darkMmsiSet = new Set(darkVessels.map((v) => v.mmsi));
  const alerts = darkVessels.map(darkVesselToAlert);
  const isLoading = cardsLoading || vesselsLoading;
  const error = cardsError ?? vesselsError;

  if (!MAPBOX_TOKEN) {
    return (
      <section className="flex h-[calc(100vh-3.75rem)] items-center justify-center bg-bg-ocean px-6">
        <div className="max-w-lg rounded-lg border border-border-subtle bg-bg-panel p-6 text-center">
          <h2 className="text-lg font-semibold text-text-primary">
            Mapbox token required
          </h2>
          <p className="mt-2 text-sm text-text-muted">
            Add <code>VITE_MAPBOX_ACCESS_TOKEN</code> to your .env file to load
            the interactive map.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="h-[calc(100vh-3.75rem)] w-full bg-bg-ocean px-6 py-5">
      <div className="flex h-full flex-col gap-5">
        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-88px animate-pulse rounded-xl border border-border-subtle bg-bg-panel shadow-panel"
                />
              ))
            : cards.map((card) => <StatCard key={card.id} card={card} />)}
        </div>

        {/* Error banner */}
        {error && (
          <p className="text-xs text-status-alert">
            Failed to load data — check that the backend is running on port
            8080.
          </p>
        )}

        {/* Map + Alerts row */}
        <div className="flex min-h-0 flex-1 gap-5">
          {/* Map */}
          <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-border-subtle bg-bg-panel shadow-panel">
            <Map
              initialViewState={{
                latitude: 55,
                longitude: 10,
                zoom: 3,
              }}
              mapStyle="mapbox://styles/mapbox/dark-v11"
              mapboxAccessToken={MAPBOX_TOKEN}
              attributionControl={false}
              reuseMaps
              style={{ width: "100%", height: "100%" }}
              onClick={() => setSelectedVessel(null)}
            >
              <NavigationControl position="top-right" />
              <ScaleControl position="bottom-left" />

              {/* Normal vessels — blue dot */}
              {vessels
                .filter((v) => !darkMmsiSet.has(v.mmsi))
                .map((vessel) => (
                  <Marker
                    key={vessel.mmsi}
                    latitude={vessel.lat}
                    longitude={vessel.lon}
                    anchor="center"
                    onClick={(e) => {
                      e.originalEvent.stopPropagation();
                      setSelectedVessel(vessel);
                    }}
                  >
                    <span
                      className="block size-3 cursor-pointer rounded-full border border-bg-ocean bg-status-info transition-transform hover:scale-150"
                      title={vessel.name}
                    />
                  </Marker>
                ))}

              {/* Dark vessels — red dot */}
              {darkVessels.map((vessel) => (
                <Marker
                  key={vessel.mmsi}
                  latitude={vessel.lat}
                  longitude={vessel.lon}
                  anchor="center"
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    setSelectedVessel(vessel);
                  }}
                >
                  <span
                    className="block size-3 cursor-pointer rounded-full border border-bg-ocean bg-status-alert transition-transform hover:scale-150"
                    title={`DARK: ${vessel.name}`}
                  />
                </Marker>
              ))}

              {/* Vessel detail popup */}
              {selectedVessel && (
                <VesselPopup
                  vessel={selectedVessel}
                  isDark={darkMmsiSet.has(selectedVessel.mmsi)}
                  onClose={() => setSelectedVessel(null)}
                />
              )}
            </Map>
          </div>

          {/* Recent Alerts panel */}
          <RecentAlerts
            alerts={alerts}
            className="w-80 shrink-0 overflow-hidden xl:w-96"
          />
        </div>
      </div>
    </section>
  );
}
