import { useEffect, useMemo, useRef } from "react";
import type { GeoJSONSource, Map as MapboxMap } from "mapbox-gl";
import type { CandidateFeatureCollection, PotholeCandidate } from "../domain/candidates";

interface MapViewProps {
  candidates: PotholeCandidate[];
  featureCollection: CandidateFeatureCollection;
  selectedId: string;
  onSelect: (candidateId: string) => void;
}

const severityColors = {
  low: "#f2d16b",
  medium: "#ec8b3a",
  high: "#d84a32",
};

export function MapView({ candidates, featureCollection, selectedId, onSelect }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

  const fallbackPins = useMemo(
    () =>
      candidates.map((candidate, index) => ({
        candidate,
        left: 22 + ((index * 17) % 56),
        top: 24 + ((index * 23) % 48),
      })),
    [candidates],
  );

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) {
      return;
    }

    let disposed = false;

    async function createMap() {
      const mapboxglModule = await import("mapbox-gl");
      await import("mapbox-gl/dist/mapbox-gl.css");

      if (disposed || !containerRef.current) {
        return;
      }

      const mapboxgl = mapboxglModule.default;
      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [-79.392, 43.653],
        zoom: 12.2,
        pitch: 0,
        attributionControl: false,
      });

      map.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), "bottom-right");
      map.addControl(new mapboxgl.AttributionControl({ compact: true }));

      map.on("load", () => {
        map.addSource("pothole-candidates", {
          type: "geojson",
          data: featureCollection,
        });

        map.addLayer({
          id: "candidate-heat",
          type: "heatmap",
          source: "pothole-candidates",
          maxzoom: 14,
          paint: {
            "heatmap-weight": ["interpolate", ["linear"], ["get", "heatIntensity"], 0, 0, 1, 1],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 0.8, 14, 1.8],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 20, 14, 42],
            "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 11, 0.85, 14, 0.25],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(242, 209, 107, 0)",
              0.35,
              "#f2d16b",
              0.65,
              "#ec8b3a",
              1,
              "#d84a32",
            ],
          },
        });

        map.addLayer({
          id: "candidate-circles",
          type: "circle",
          source: "pothole-candidates",
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["get", "heatRadiusMeters"],
              14,
              9,
              40,
              24,
            ],
            "circle-color": [
              "match",
              ["get", "severity"],
              "high",
              severityColors.high,
              "medium",
              severityColors.medium,
              severityColors.low,
            ],
            "circle-opacity": 0.78,
            "circle-stroke-width": ["case", ["==", ["get", "id"], selectedId], 3, 1],
            "circle-stroke-color": "#1e2a24",
          },
        });

        map.on("click", "candidate-circles", (event) => {
          const feature = event.features?.[0];
          const id = feature?.properties?.id;

          if (typeof id === "string") {
            onSelect(id);
          }
        });

        map.on("mouseenter", "candidate-circles", () => {
          map.getCanvas().style.cursor = "pointer";
        });

        map.on("mouseleave", "candidate-circles", () => {
          map.getCanvas().style.cursor = "";
        });
      });

      mapRef.current = map;
    }

    void createMap();

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [featureCollection, onSelect, selectedId, token]);

  useEffect(() => {
    const source = mapRef.current?.getSource("pothole-candidates") as GeoJSONSource | undefined;

    source?.setData(featureCollection);
  }, [featureCollection]);

  if (!token) {
    return (
      <section className="map-fallback" aria-label="Pothole candidate map preview">
        <div className="map-grid" />
        {fallbackPins.map(({ candidate, left, top }) => (
          <button
            className={`map-pin map-pin-${candidate.severity} ${
              selectedId === candidate.id ? "map-pin-selected" : ""
            }`}
            key={candidate.id}
            onClick={() => onSelect(candidate.id)}
            style={{ left: `${left}%`, top: `${top}%` }}
            type="button"
            aria-label={`Select ${candidate.address}`}
          >
            <span>{candidate.confidenceScore}</span>
          </button>
        ))}
        <div className="map-token-note">Set VITE_MAPBOX_TOKEN to enable the live Mapbox base map.</div>
      </section>
    );
  }

  return <section ref={containerRef} className="map-canvas" aria-label="Pothole candidate map" />;
}
