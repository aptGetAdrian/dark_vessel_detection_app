import { useMemo, useCallback } from "react";
import MapGL, { Source, Layer } from "react-map-gl/mapbox";
import type { MapMouseEvent } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { EUScanAreas } from "@/lib/scanAreas";
import { MAPBOX_DARK_STYLE } from "@/lib/constants";
import type { ZoneStats, ZoneMetric } from "@/types/analytics";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined;

function getMetricValue(zone: ZoneStats, metric: ZoneMetric): number {
  switch (metric) {
    case "detections": return zone.total_detections;
    case "dark_vessels": return zone.dark_vessels;
    case "alerts": return zone.alert_count;
    case "match_rate": return zone.match_rate * 100;
  }
}

interface Props {
  zones: ZoneStats[];
  metric: ZoneMetric;
  selectedZone: string | null;
  onSelectZone: (name: string) => void;
}

export function ZoneReferenceMap({ zones, metric, selectedZone, onSelectZone }: Props) {
  const geojson = useMemo(() => {
    const zoneMap = new Map(zones.map((z) => [z.name, z]));
    const maxVal = Math.max(1, ...zones.map((z) => getMetricValue(z, metric)));

    const features = EUScanAreas.map((area) => {
      const stats = zoneMap.get(area.name);
      const value = stats ? getMetricValue(stats, metric) : 0;
      const intensity = value / maxVal;

      return {
        type: "Feature" as const,
        properties: {
          name: area.name,
          intensity,
          value,
          isSelected: area.name === selectedZone ? 1 : 0,
        },
        geometry: {
          type: "Polygon" as const,
          coordinates: [[
            [area.minLon, area.minLat],
            [area.maxLon, area.minLat],
            [area.maxLon, area.maxLat],
            [area.minLon, area.maxLat],
            [area.minLon, area.minLat],
          ]],
        },
      };
    });

    return { type: "FeatureCollection" as const, features };
  }, [zones, metric, selectedZone]);

  const handleClick = useCallback((e: MapMouseEvent) => {
    const feature = e.features?.[0];
    if (feature?.properties?.name) {
      onSelectZone(feature.properties.name);
    }
  }, [onSelectZone]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-xl border border-border-subtle bg-bg-panel">
        <p className="text-sm text-text-muted">VITE_MAPBOX_ACCESS_TOKEN not set</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg-panel shadow-panel">
      <MapGL
        initialViewState={{ latitude: 48, longitude: 8, zoom: 2.8 }}
        style={{ width: "100%", height: 320 }}
        mapStyle={MAPBOX_DARK_STYLE}
        mapboxAccessToken={MAPBOX_TOKEN}
        interactive={true}
        scrollZoom={false}
        interactiveLayerIds={["zone-fill"]}
        onClick={handleClick}
        cursor="pointer"
      >
        <Source id="zones" type="geojson" data={geojson}>
          <Layer
            id="zone-fill"
            type="fill"
            paint={{
              "fill-color": [
                "interpolate", ["linear"], ["get", "intensity"],
                0, "rgba(122, 170, 206, 0.1)",
                0.3, "rgba(212, 162, 76, 0.3)",
                0.6, "rgba(223, 102, 102, 0.4)",
                1, "rgba(223, 102, 102, 0.7)",
              ],
              "fill-opacity": 0.8,
            }}
          />
          <Layer
            id="zone-border"
            type="line"
            paint={{
              "line-color": [
                "case",
                ["==", ["get", "isSelected"], 1], "#f7f8f0",
                "rgba(122, 170, 206, 0.4)",
              ],
              "line-width": [
                "case",
                ["==", ["get", "isSelected"], 1], 2.5,
                1,
              ],
            }}
          />
          <Layer
            id="zone-label"
            type="symbol"
            layout={{
              "text-field": ["get", "name"],
              "text-size": 10,
              "text-anchor": "center",
            }}
            paint={{
              "text-color": "#b9c2c9",
              "text-halo-color": "#0d1117",
              "text-halo-width": 1,
            }}
          />
        </Source>
      </MapGL>
    </div>
  );
}
