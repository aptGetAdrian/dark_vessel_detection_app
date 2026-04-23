import { useState } from "react";
import Map, {
  Marker,
  Popup,
  NavigationControl,
  ScaleControl,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { Satellite } from "lucide-react";
import { StatCard } from "@/components/ui/statCard";
import { useDashboardCards } from "@/hooks/Usedashboardcards";
import { useVessels } from "@/hooks/useVessels";
import { useSatelliteDetections } from "@/hooks/useSatelliteDetections";
import { RecentAlerts } from "@/components/ui/RecentAlerts";
import { VesselPopup } from "@/components/map/VesselPopup";
import { VesselModal } from "@/components/map/VesselModal";
import type { VesselAlert, Vessel, SatelliteDetection } from "@/types/dashboard";

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

function formatDetectedAt(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (diff < 1) return `${Math.round(diff * 60)}m ago`;
  if (diff < 24) return `${Math.floor(diff)}h ago`;
  return `${Math.floor(diff / 24)}d ago`;
}

export function InteractiveMap() {
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [modalVessel, setModalVessel] = useState<Vessel | null>(null);
  const [selectedDetection, setSelectedDetection] = useState<SatelliteDetection | null>(null);
  const [showSatellite, setShowSatellite] = useState(false);
  const [selectedArea, setSelectedArea] = useState("");

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
  const { detections, scanAreas } = useSatelliteDetections(selectedArea);

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
          <div className="relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-border-subtle bg-bg-panel shadow-panel">
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
              onClick={() => {
                setSelectedVessel(null);
                setSelectedDetection(null);
              }}
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
                      setSelectedDetection(null);
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
                    setSelectedDetection(null);
                    setSelectedVessel(vessel);
                  }}
                >
                  <span
                    className="block size-3 cursor-pointer rounded-full border border-bg-ocean bg-status-alert transition-transform hover:scale-150"
                    title={`DARK: ${vessel.name}`}
                  />
                </Marker>
              ))}

              {/* Satellite detections — diamond markers */}
              {showSatellite &&
                detections.map((det) => (
                  <Marker
                    key={det.id}
                    latitude={det.lat}
                    longitude={det.lon}
                    anchor="center"
                    onClick={(e) => {
                      e.originalEvent.stopPropagation();
                      setSelectedVessel(null);
                      setSelectedDetection(det);
                    }}
                  >
                    <span
                      className="block size-3 cursor-pointer rotate-45 border border-bg-ocean transition-transform hover:scale-150"
                      style={{
                        backgroundColor: det.matched_mmsi == null
                          ? "#d4a24c"  // amber — unmatched (dark vessel candidate)
                          : "#4a5568", // gray — AIS-confirmed, no concern
                      }}
                      title={
                        det.matched_mmsi == null
                          ? "SAR: unmatched (dark vessel candidate)"
                          : `SAR: matched to ${det.matched_name}`
                      }
                    />
                  </Marker>
                ))}

              {/* Vessel detail popup */}
              {selectedVessel && (
                <VesselPopup
                  vessel={selectedVessel}
                  isDark={darkMmsiSet.has(selectedVessel.mmsi)}
                  onClose={() => setSelectedVessel(null)}
                  onViewMore={() => {
                    setModalVessel(selectedVessel);
                    setSelectedVessel(null);
                  }}
                />
              )}

              {/* Satellite detection popup */}
              {selectedDetection && (
                <Popup
                  latitude={selectedDetection.lat}
                  longitude={selectedDetection.lon}
                  anchor="bottom"
                  onClose={() => setSelectedDetection(null)}
                  closeOnClick={false}
                  className="satellite-popup"
                >
                  <div className="min-w-[180px] rounded-lg bg-bg-panel p-3 text-xs">
                    <div className="mb-2 flex items-center gap-2">
                      <Satellite size={13} className="shrink-0 text-status-warning" />
                      <span className="font-semibold uppercase tracking-wide text-text-primary">
                        SAR Detection
                      </span>
                    </div>

                    <div className="space-y-1 text-text-muted">
                      <div className="flex justify-between gap-4">
                        <span>Status</span>
                        {selectedDetection.matched_mmsi == null ? (
                          <span className="font-medium text-status-warning">Unmatched</span>
                        ) : (
                          <span className="font-medium text-status-info">Matched</span>
                        )}
                      </div>

                      {selectedDetection.matched_name && (
                        <div className="flex justify-between gap-4">
                          <span>Vessel</span>
                          <span className="font-medium text-text-primary">{selectedDetection.matched_name}</span>
                        </div>
                      )}

                      <div className="flex justify-between gap-4">
                        <span>Detected</span>
                        <span className="font-medium text-text-primary">{formatDetectedAt(selectedDetection.detected_at)}</span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span>Source</span>
                        <span className="font-medium text-text-primary">{selectedDetection.source}</span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span>Position</span>
                        <span className="font-medium text-text-primary">
                          {selectedDetection.lat.toFixed(3)}°N · {selectedDetection.lon.toFixed(3)}°E
                        </span>
                      </div>
                    </div>
                  </div>
                </Popup>
              )}
            </Map>

            {/* Satellite layer controls — bottom-right overlay */}
            <div className="absolute bottom-8 right-3 z-10 flex items-center gap-2">
              {showSatellite && scanAreas.length > 0 && (
                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="rounded-lg border px-2 py-2 text-xs font-medium shadow-lg outline-none"
                  style={{
                    backgroundColor: "#151c24",
                    borderColor: "#7aaace",
                    color: "#f7f8f0",
                  }}
                >
                  <option value="">All areas</option>
                  {scanAreas.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              )}
              <button
                onClick={() => {
                  if (showSatellite) setSelectedDetection(null);
                  setShowSatellite((v) => !v);
                }}
                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium shadow-lg transition-colors"
                style={{
                  backgroundColor: showSatellite ? "#355872" : "#151c24",
                  borderColor: showSatellite ? "#7aaace" : "#2a3442",
                  color: showSatellite ? "#f7f8f0" : "#b9c2c9",
                }}
              >
                <Satellite size={13} />
                Satellite Layer
                <span
                  className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold"
                  style={{
                    backgroundColor: showSatellite ? "#7aaace22" : "#2a3442",
                    color: showSatellite ? "#7aaace" : "#b9c2c9",
                  }}
                >
                  {showSatellite ? "ON" : "OFF"}
                </span>
              </button>
            </div>
          </div>

          {/* Recent Alerts panel */}
          <RecentAlerts
            alerts={alerts}
            className="w-80 shrink-0 overflow-hidden xl:w-96"
          />
        </div>
      </div>

      {/* Vessel detail modal */}
      {modalVessel && (
        <VesselModal
          vessel={modalVessel}
          isDark={darkMmsiSet.has(modalVessel.mmsi)}
          onClose={() => setModalVessel(null)}
        />
      )}
    </section>
  );
}
