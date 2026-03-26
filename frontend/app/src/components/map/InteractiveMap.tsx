import Map, {
  Marker,
  NavigationControl,
  ScaleControl,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as
  | string
  | undefined;

const sampleVessels = [
  { id: "v-101", latitude: 37.7749, longitude: -122.4194 },
  { id: "v-102", latitude: 34.0522, longitude: -118.2437 },
  { id: "v-103", latitude: 36.1699, longitude: -115.1398 },
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
    <section className="h-[calc(100vh-3.75rem)] w-full">
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
    </section>
  );
}