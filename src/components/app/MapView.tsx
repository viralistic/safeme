// MapLibre map with a severity heat layer and accessible pin markers. No Google Maps.
import { useEffect, useRef, useState } from "react";
import type { Map as MlMap, Marker, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getCategory } from "@/lib/categories";
import { level, severityLabel } from "@/lib/severity";
import { ago } from "@/lib/time";
import type { LatLon } from "@/lib/fuzz";
import type { PublicReport } from "@/lib/types";

const STYLE = import.meta.env.PUBLIC_MAP_STYLE || "https://tiles.openfreemap.org/styles/dark";

// Used when the tile server is unreachable: heat and pins still work on a plain grey base.
const FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#2b2e35" } }],
};

export interface MapConfig {
  style: StyleSpecification;
  maxBounds?: [[number, number], [number, number]];
  minZoom?: number;
}

let override: (() => Promise<MapConfig>) | null = null;

/** Replace the tile style, for example with tiles embedded in a single-file demo. */
export function configureMap(fn: () => Promise<MapConfig>) {
  override = fn;
}

async function loadStyle(): Promise<StyleSpecification> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(STYLE, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch {
    return FALLBACK_STYLE;
  }
}

interface Props {
  reports: PublicReport[];
  center: LatLon;
  /** Changes to this value fly the map to `center`. */
  flyKey: number;
  me: LatLon | null;
  onSelect: (r: PublicReport) => void;
  onMove: (c: LatLon) => void;
}

function toGeoJSON(reports: PublicReport[]) {
  return {
    type: "FeatureCollection" as const,
    features: reports
      .filter((r) => !getCategory(r.category)?.welfare)
      .map((r) => ({
        type: "Feature" as const,
        properties: { w: 0.15 + (r.severity / 100) * 0.85 },
        geometry: { type: "Point" as const, coordinates: [r.lon, r.lat] },
      })),
  };
}

/** Pull the vector base map toward the calm grey of the design. */
function greyDown(map: MlMap) {
  for (const layer of map.getStyle().layers ?? []) {
    try {
      if (layer.type === "background") map.setPaintProperty(layer.id, "background-color", "#2b2e35");
      else if (layer.type === "fill" && /water/i.test(layer.id)) map.setPaintProperty(layer.id, "fill-color", "#22252c");
      else if (layer.type === "fill" && /(landuse|park|wood|grass|landcover)/i.test(layer.id))
        map.setPaintProperty(layer.id, "fill-color", "#30333a");
      else if (layer.type === "fill" && /building/i.test(layer.id)) map.setPaintProperty(layer.id, "fill-color", "#353840");
      else if (layer.type === "line" && /(road|street|highway|transportation)/i.test(layer.id))
        map.setPaintProperty(layer.id, "line-color", "rgba(255,255,255,0.09)");
    } catch {}
  }
}

export default function MapView({ reports, center, flyKey, me, onSelect, onMove }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const meMarker = useRef<Marker | null>(null);
  const ml = useRef<typeof import("maplibre-gl") | null>(null);
  const [ready, setReady] = useState(false);
  const latest = useRef({ reports, onSelect, onMove });
  latest.current = { reports, onSelect, onMove };

  useEffect(() => {
    let cancelled = false;
    Promise.all([import("maplibre-gl"), override ? override() : loadStyle().then((style) => ({ style }) as MapConfig)]).then(([mod, cfg]) => {
      if (cancelled || !el.current) return;
      const { style } = cfg;
      ml.current = mod;
      const map = new mod.Map({
        container: el.current,
        style,
        center: [center.lon, center.lat],
        zoom: 13.6,
        minZoom: cfg.minZoom ?? 7,
        maxBounds: cfg.maxBounds,
        maxZoom: 17,
        attributionControl: { compact: true },
        pitchWithRotate: false,
        dragRotate: false,
      });
      map.touchZoomRotate.disableRotation();
      mapRef.current = map;

      map.on("load", () => {
        greyDown(map);
        map.addSource("reports", { type: "geojson", data: toGeoJSON(latest.current.reports) });
        map.addLayer({
          id: "heat",
          type: "heatmap",
          source: "reports",
          maxzoom: 18,
          paint: {
            "heatmap-weight": ["get", "w"],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 9, 0.8, 15, 2.2],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 9, 16, 13, 48, 16, 96],
            "heatmap-opacity": 0.88,
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0, "rgba(0,0,0,0)",
              0.12, "rgba(86,120,205,0.32)",
              0.35, "rgba(86,120,205,0.5)",
              0.55, "rgba(84,66,150,0.6)",
              0.75, "rgba(154,34,48,0.85)",
              1, "rgba(237,50,40,0.98)",
            ],
          },
        });
        renderMarkers();
        setReady(true);
      });
      map.on("moveend", () => {
        const c = map.getCenter();
        latest.current.onMove({ lat: c.lat, lon: c.lng });
      });
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  function renderMarkers() {
    const map = mapRef.current;
    const mod = ml.current;
    if (!map || !mod) return;
    markers.current.forEach((m) => m.remove());
    markers.current = latest.current.reports
      .slice()
      .sort((a, b) => a.severity - b.severity)
      .map((r) => {
        const cat = getCategory(r.category);
        const btn = document.createElement("button");
        const lv = level(r.severity);
        btn.className = `pin ${cat?.welfare ? "welfare" : lv === "low" ? "lo" : lv === "mid" ? "md" : "hi"}`;
        btn.type = "button";
        btn.setAttribute(
          "aria-label",
          `${cat?.label ?? "Melding"}, ${severityLabel(r.severity, cat?.welfare).toLowerCase()}, ${ago(r.created_at)}`,
        );
        btn.innerHTML = '<span class="h"></span>';
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          latest.current.onSelect(r);
        });
        return new mod.Marker({ element: btn, anchor: "bottom" }).setLngLat([r.lon, r.lat]).addTo(map);
      });
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource("reports") as import("maplibre-gl").GeoJSONSource | undefined;
    src?.setData(toGeoJSON(reports));
    renderMarkers();
  }, [reports, ready]);

  useEffect(() => {
    if (flyKey === 0) return;
    mapRef.current?.flyTo({ center: [center.lon, center.lat], zoom: Math.max(mapRef.current.getZoom(), 13.6), duration: 900 });
  }, [flyKey]);

  useEffect(() => {
    const map = mapRef.current;
    const mod = ml.current;
    if (!me) {
      meMarker.current?.remove();
      meMarker.current = null;
      return;
    }
    if (!map || !mod) return;
    if (!meMarker.current) {
      const dot = document.createElement("div");
      dot.setAttribute("aria-hidden", "true");
      dot.style.cssText =
        "width:16px;height:16px;border-radius:50%;background:var(--cyan);border:3px solid #0b0e16;box-shadow:0 0 0 6px rgba(56,210,255,.18),0 0 16px rgba(56,210,255,.7)";
      meMarker.current = new mod.Marker({ element: dot }).setLngLat([me.lon, me.lat]).addTo(map);
    } else meMarker.current.setLngLat([me.lon, me.lat]);
  }, [me, ready]);

  return (
    <div className="map-wrap">
      <div ref={el} className="h-full w-full" role="region" aria-label="Kaart met meldingen" />
    </div>
  );
}
