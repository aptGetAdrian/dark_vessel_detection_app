import { useState, useRef, useCallback, useMemo } from "react";
import Map, {
  Marker,
  Popup,
  Source,
  Layer,
  NavigationControl,
  ScaleControl,
} from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { Satellite } from "lucide-react";
import { StatusStrip } from "@/components/ui/StatCard";
import { useDashboardCards } from "@/hooks/useDashboardCards";
import { useVessels } from "@/hooks/useVessels";
import { useSatelliteDetections } from "@/hooks/useSatelliteDetections";
import { useVesselTrack } from "@/hooks/useVesselTrack";
import { RecentAlerts } from "@/components/ui/RecentAlerts";
import { VesselPopup } from "@/components/map/VesselPopup";
import { VesselModal } from "@/components/map/VesselModal";
import { VesselMarkerIcon } from "@/components/map/VesselMarkerIcon";
import { MapLegend } from "@/components/map/MapLegend";
import type {
  VesselAlert,
  Vessel,
  SatelliteDetection,
} from "@/types/dashboard";
import {
  DEFAULT_MAP_CENTER,
  MAPBOX_DARK_STYLE,
  RISK_CRITICAL_THRESHOLD,
} from "@/lib/constants";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as
  | string
  | undefined;

function darkVesselToAlert(vessel: Vessel, index: number): VesselAlert {
  const hoursOffline =
    (Date.now() - new Date(vessel.last_ais).getTime()) / 3_600_000;

  const severity: VesselAlert["severity"] =
    (vessel.risk_score ?? 0) >= RISK_CRITICAL_THRESHOLD
      ? "CRITICAL"
      : "WARNING";

  const flagSummary = vessel.anomaly_flags?.length
    ? ` Flags: ${vessel.anomaly_flags.join(", ")}.`
    : "";

  return {
    id: `ALT-${String(index + 1).padStart(3, "0")}`,
    severity,
    status: "NEW",
    vesselName: vessel.name,
    description: `AIS signal lost for ${Math.floor(hoursOffline)}h. MMSI: ${vessel.mmsi}.${flagSummary}`,
    location: `${vessel.lat.toFixed(2)}°N, ${vessel.lon.toFixed(2)}°E`,
    timestamp: new Date(vessel.last_ais),
    confidence: vessel.confidence ?? 0,
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
  const [selectedDetection, setSelectedDetection] =
    useState<SatelliteDetection | null>(null);
  const [showSatellite, setShowSatellite] = useState(false);
  const [selectedArea, setSelectedArea] = useState("");
  const mapRef = useRef<MapRef>(null);

  const {
    cards,
    isLoading: cardsLoading,
    error: cardsError,
    lastUpdated,
  } = useDashboardCards();
  const {
    vessels,
    darkVessels,
    isLoading: vesselsLoading,
    error: vesselsError,
  } = useVessels();
  const { detections, scanAreas } = useSatelliteDetections(selectedArea);
  const { positions: trackPositions } = useVesselTrack(
    selectedVessel?.mmsi ?? null,
  );

  const trackGeoJSON = useMemo(() => {
    if (trackPositions.length < 2) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: trackPositions.map((p) => [p.lon, p.lat]),
      },
    };
  }, [trackPositions]);

  const darkMmsiSet = new Set(darkVessels.map((v) => v.mmsi));
  const alerts = darkVessels.map(darkVesselToAlert);
  const isLoading = cardsLoading || vesselsLoading;
  const error = cardsError ?? vesselsError;

  const handleCenterVessel = useCallback((lat: number, lon: number) => {
    mapRef.current?.flyTo({
      center: [lon, lat],
      zoom: 8,
      duration: 1200,
    });
  }, []);

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
      <div className="flex h-full flex-col gap-4">
        {/* Status readout + last updated */}
        {isLoading ? (
          <div className="h-[62px] animate-pulse rounded-xl border border-border-subtle bg-bg-panel" />
        ) : (
          <StatusStrip cards={cards} lastUpdated={lastUpdated} error={error} />
        )}

        {/* Error banner */}
        {error && (
          <p className="text-xs text-status-alert">
            Failed to load data. Check that the backend is running on port 8080.
          </p>
        )}

        {/* Map + Alerts row */}
        <div className="flex min-h-0 flex-1 gap-5">
          {/* Map */}
          <div className="relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-border-subtle bg-bg-panel shadow-panel">
            <Map
              ref={mapRef}
              initialViewState={DEFAULT_MAP_CENTER}
              mapStyle={MAPBOX_DARK_STYLE}
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

              {/* Normal vessels */}
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
                    <VesselMarkerIcon
                      cog={vessel.cog}
                      heading={vessel.heading}
                      isDark={false}
                      isSelected={selectedVessel?.mmsi === vessel.mmsi}
                    />
                  </Marker>
                ))}

              {/* Dark vessels */}
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
                  <VesselMarkerIcon
                    cog={vessel.cog}
                    heading={vessel.heading}
                    isDark={true}
                    isSelected={selectedVessel?.mmsi === vessel.mmsi}
                  />
                </Marker>
              ))}

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
                      className={`block size-3 cursor-pointer rotate-45 border border-bg-ocean transition-transform hover:scale-150 ${
                        det.matched_mmsi == null
                          ? "bg-status-warning"
                          : "bg-bg-surface"
                      }`}
                      title={
                        det.matched_mmsi == null
                          ? "SAR: unmatched (dark vessel candidate)"
                          : `SAR: matched to ${det.matched_name}`
                      }
                    />
                  </Marker>
                ))}

              {/* Vessel trail */}
              {trackGeoJSON && (
                <Source id="vessel-track" type="geojson" data={trackGeoJSON}>
                  <Layer
                    id="vessel-track-line"
                    type="line"
                    paint={{
                      "line-color":
                        selectedVessel && darkMmsiSet.has(selectedVessel.mmsi)
                          ? "#df6666"
                          : "#7aaace",
                      "line-width": 2,
                      "line-opacity": 0.7,
                      "line-dasharray": [2, 2],
                    }}
                  />
                </Source>
              )}

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
                      <Satellite
                        size={13}
                        className="shrink-0 text-status-warning"
                      />
                      <span className="font-semibold uppercase tracking-wide text-text-primary">
                        SAR Detection
                      </span>
                    </div>

                    <div className="space-y-1 text-text-muted">
                      <div className="flex justify-between gap-4">
                        <span>Status</span>
                        {selectedDetection.matched_mmsi == null ? (
                          <span className="font-medium text-status-warning">
                            Unmatched
                          </span>
                        ) : (
                          <span className="font-medium text-status-info">
                            Matched
                          </span>
                        )}
                      </div>

                      {selectedDetection.matched_name && (
                        <div className="flex justify-between gap-4">
                          <span>Vessel</span>
                          <span className="font-medium text-text-primary">
                            {selectedDetection.matched_name}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between gap-4">
                        <span>Detected</span>
                        <span className="font-medium text-text-primary">
                          {formatDetectedAt(selectedDetection.detected_at)}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span>Source</span>
                        <span className="font-medium text-text-primary">
                          {selectedDetection.source}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span>Position</span>
                        <span className="font-medium text-text-primary">
                          {selectedDetection.lat.toFixed(3)}°N ·{" "}
                          {selectedDetection.lon.toFixed(3)}°E
                        </span>
                      </div>
                    </div>
                  </div>
                </Popup>
              )}
            </Map>

            <MapLegend showSatellite={showSatellite} />

            <div className="absolute bottom-8 right-3 z-10 flex items-center gap-2">
              {showSatellite && scanAreas.length > 0 && (
                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="rounded-lg border border-accent bg-bg-panel px-2 py-2 text-xs font-medium text-text-primary shadow-lg outline-none"
                >
                  <option value="">All areas</option>
                  {scanAreas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => {
                  if (showSatellite) setSelectedDetection(null);
                  setShowSatellite((v) => !v);
                }}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium shadow-lg transition-colors ${
                  showSatellite
                    ? "border-accent bg-accent-strong text-text-primary"
                    : "border-border-subtle bg-bg-panel text-text-muted"
                }`}
              >
                <Satellite size={13} />
                Satellite Layer
                <span
                  className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    showSatellite
                      ? "bg-accent-soft text-accent"
                      : "bg-bg-surface text-text-muted"
                  }`}
                >
                  {showSatellite ? "ON" : "OFF"}
                </span>
              </button>
            </div>
          </div>

          <RecentAlerts
            alerts={alerts}
            className="w-80 shrink-0 overflow-hidden xl:w-96"
            onCenterVessel={handleCenterVessel}
          />
        </div>
      </div>

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
