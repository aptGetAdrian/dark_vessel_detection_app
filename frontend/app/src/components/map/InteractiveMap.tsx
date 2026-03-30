import Map, {
  Marker,
  NavigationControl,
  ScaleControl,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

import { StatCard } from "@/components/ui/statCard";
import { useDashboardCards } from "@/hooks/Usedashboardcards";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as
  | string
  | undefined;

const sampleVessels = [
  { id: "v-101", latitude: 37.7749, longitude: -122.4194 },
  { id: "v-102", latitude: 34.0522, longitude: -118.2437 },
  { id: "v-103", latitude: 36.1699, longitude: -115.1398 },
];

export function InteractiveMap() {
  const { cards, isLoading, error } = useDashboardCards();

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
                  className="h-[88px] animate-pulse rounded-xl border border-border-subtle bg-bg-panel shadow-panel"
                />
              ))
            : cards.map((card) => <StatCard key={card.id} card={card} />)}
        </div>

        {/* Error banner */}
        {error && (
          <p className="text-xs text-status-alert">
            Failed to load dashboard data — showing last known values.
          </p>
        )}

        {/* Map */}
        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border-subtle bg-bg-panel shadow-panel">
          <Map
            initialViewState={{
              latitude: 36.5,
              longitude: -121,
              zoom: 4,
            }}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            mapboxAccessToken={MAPBOX_TOKEN}
            attributionControl={false}
            reuseMaps
            style={{ width: "100%", height: "100%" }}
          >
            <NavigationControl position="top-right" />
            <ScaleControl position="bottom-left" />

            {sampleVessels.map((vessel) => (
              <Marker
                key={vessel.id}
                latitude={vessel.latitude}
                longitude={vessel.longitude}
                anchor="center"
              >
                <span className="block size-3 rounded-full border border-bg-ocean bg-status-alert" />
              </Marker>
            ))}
          </Map>
        </div>
      </div>
    </section>
  );
}
