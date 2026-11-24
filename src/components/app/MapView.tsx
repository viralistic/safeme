// MapLibre map with a severity heat layer and accessible pin markers. No Google Maps.
import { useEffect, useRef, useState } from "react";
import type { Map as MlMap, Marker, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getCategory } from "@/lib/categories";
import { level, severityLabel } from "@/lib/severity";
import { ago } from "@/lib/time";
import type { LatLon } from "@/lib/fuzz";
import type { PublicReport } from "@/lib/types";
import { t } from "@/lib/i18n";

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

/** PUBLIC_MAP_STYLE=self: tiles, fonts and sprites served by our own server from TILES_DIR. */
async function selfHostedStyle(ml: typeof import("maplibre-gl")): Promise<StyleSpecification> {
  const [{ Protocol }, { layers, namedFlavor }] = await Promise.all([import("pmtiles"), import("@protomaps/basemaps")]);
  const protocol = new Protocol();
  ml.addProtocol("pmtiles", protocol.tile);
  const file = import.meta.env.PUBLIC_TILES_FILE || "netherlands.pmtiles";
  const origin = location.origin;
  return {
    version: 8,
    glyphs: `${origin}/tiles/fonts/{fontstack}/{range}.pbf`,
    sprite: `${origin}/tiles/sprites/v4/dark`,
    sources: {
      protomaps: {
        type: "vector",
        url: `pmtiles://${origin}/tiles/${file}`,
        attribution: "© OpenStreetMap",
      },
    },
    layers: layers("protomaps", namedFlavor("dark"), { lang: "nl" }) as StyleSpecification["layers"],
  };
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

/** Other things on the map: buurtteam walks, private signals for police. */
export interface MapExtra {
  id: string;
  lat: number;
  lon: number;
  kind: "walk" | "signal";
  label: string;
}

/** A route: the chosen line, and the alternatives it beat. Coordinates as [lon, lat]. */
export interface MapRoute {
  best: [number, number][];
  others: [number, number][][];
}

interface Props {
  extras?: MapExtra[];
  route?: MapRoute | null;
  onExtra?: (e: MapExtra) => void;
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

export default function MapView({ reports, center, flyKey, me, onSelect, onMove, extras = [], route = null, onExtra }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const meMarker = useRef<Marker | null>(null);
  const extraMarkers = useRef<Marker[]>([]);
  const ml = useRef<typeof import("maplibre-gl") | null>(null);
  const [ready, setReady] = useState(false);
  const latest = useRef({ reports, onSelect, onMove, onExtra });
  latest.current = { reports, onSelect, onMove, onExtra };

  useEffect(() => {
    let cancelled = false;
    import("maplibre-gl")
      .then(async (mod) => {
        const cfg: MapConfig = override
          ? await override()
          : { style: STYLE === "self" ? await selfHostedStyle(mod).catch(() => FALLBACK_STYLE) : await loadStyle() };
        return [mod, cfg] as const;
      })
      .then(([mod, cfg]) => {
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
          `${cat?.label ?? t("Melding")}, ${severityLabel(r.severity, cat?.welfare).toLowerCase()}, ${ago(r.created_at)}`,
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

  useEffect(() => {
    const map = mapRef.current;
    const mod = ml.current;
    if (!map || !mod || !ready) return;
    extraMarkers.current.forEach((m) => m.remove());
    extraMarkers.current = extras.map((e) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `extra ${e.kind}`;
      btn.setAttribute("aria-label", e.label);
      btn.innerHTML = '<span class="ring"></span>';
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        latest.current.onExtra?.(e);
      });
      return new mod.Marker({ element: btn }).setLngLat([e.lon, e.lat]).addTo(map);
    });
  }, [extras, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const data = {
      type: "FeatureCollection" as const,
      features: route
        ? [
            ...route.others.map((c) => ({ type: "Feature" as const, properties: { best: 0 }, geometry: { type: "LineString" as const, coordinates: c } })),
            { type: "Feature" as const, properties: { best: 1 }, geometry: { type: "LineString" as const, coordinates: route.best } },
          ]
        : [],
    };
    const src = map.getSource("route") as import("maplibre-gl").GeoJSONSource | undefined;
    if (src) src.setData(data);
    else {
      map.addSource("route", { type: "geojson", data });
      map.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["case", ["==", ["get", "best"], 1], "#38d2ff", "#8c9cb1"],
          "line-width": ["case", ["==", ["get", "best"], 1], 5, 3],
          "line-opacity": ["case", ["==", ["get", "best"], 1], 0.95, 0.35],
        },
      });
    }
    if (route?.best.length) {
      const lons = route.best.map((c) => c[0]);
      const lats = route.best.map((c) => c[1]);
      map.fitBounds(
        [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)],
        ],
        { padding: 80, duration: 800 },
      );
    }
  }, [route, ready]);

  return (
    <div className="map-wrap">
      <div ref={el} className="h-full w-full" role="region" aria-label="Kaart met meldingen" />
    </div>
  );
}
