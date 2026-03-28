import Map, {
  Marker,
  NavigationControl,
  ScaleControl,
} from "react-map-gl/mapbox";
import { AlertTriangle, Activity, Map as MapIcon, Clock3 } from "lucide-react";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as
  | string
  | undefined;

const sampleVessels = [
  { id: "v-101", latitude: 37.7749, longitude: -122.4194 },
  { id: "v-102", latitude: 34.0522, longitude: -118.2437 },
  { id: "v-103", latitude: 36.1699, longitude: -115.1398 },
];

const dashboardCards = [
  {
    id: "active-vessels",
    title: "Active Dark Vessels",
    value: "4",
    icon: AlertTriangle,
    iconClass: "text-status-alert",
    iconBgClass: "bg-status-alert/12",
  },
  {
    id: "high-severity",
    title: "High Severity Alerts",
    value: "4",
    icon: Activity,
    iconClass: "text-status-warning",
    iconBgClass: "bg-status-warning/12",
  },
  {
    id: "coverage",
    title: "Coverage Area",
    value: "2840K km²",
    icon: MapIcon,
    iconClass: "text-status-info",
    iconBgClass: "bg-status-info/14",
  },
  {
    id: "last-update",
    title: "Last Update",
    value: "15:25:55",
    icon: Clock3,
    iconClass: "text-accent",
    iconBgClass: "bg-accent-soft",
  },
];

export function InteractiveMap() {
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dashboardCards.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.id}
                className="flex min-h-32 items-center gap-5 rounded-2xl border border-border-subtle bg-bg-panel px-6 py-5 shadow-panel"
              >
                <div
                  className={`flex size-16 shrink-0 items-center justify-center rounded-xl ${card.iconBgClass}`}
                >
                  <Icon
                    className={`size-8 ${card.iconClass}`}
                    strokeWidth={2.2}
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-sm text-text-muted lg:text-[18px]">
                    {card.title}
                  </p>
                  <p className="mt-1 text-4xl font-semibold tracking-tight text-text-primary">
                    {card.value}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

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
