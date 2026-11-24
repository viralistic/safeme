// The live map: MapLibre Native with the same heat layer and pins as the web app.
import { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import { Camera, GeoJSONSource, Layer, Map, Marker, type CameraRef } from "@maplibre/maplibre-react-native";
import { getCategory } from "@shared/categories";
import { level, severityLabel } from "@shared/severity";
import { ago } from "@shared/time";
import type { PublicReport } from "@shared/types";
import { MAP_STYLE } from "@/city";
import { useApp, type Walk } from "@/state";
import { C } from "@/theme";

export interface RouteLine {
  best: [number, number][];
  others: [number, number][][];
}

function Pin({ r }: { r: PublicReport }) {
  const cat = getCategory(r.category);
  const lv = level(r.severity);
  const size = lv === "high" ? 26 : lv === "low" ? 18 : 22;
  const color = cat?.welfare ? "#0b0e16" : lv === "low" ? C.powder : lv === "mid" ? C.oxblood : C.red;
  return (
    <View style={{ alignItems: "center", justifyContent: "center", width: 54, height: 54 }}>
      {lv === "high" && !cat?.welfare && <View style={{ position: "absolute", width: 48, height: 48, borderRadius: 24, backgroundColor: C.red, opacity: 0.25 }} />}
      <View
        style={{
          width: size,
          height: size,
          borderTopLeftRadius: size / 2,
          borderTopRightRadius: size / 2,
          borderBottomRightRadius: size / 2,
          backgroundColor: color,
          transform: [{ rotate: "-45deg" }],
          borderWidth: cat?.welfare ? 3 : 2,
          borderColor: cat?.welfare ? C.cyan : C.mapGrey,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.6,
          shadowRadius: 5,
        }}
      >
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: cat?.welfare ? C.cyan : "rgba(11,14,22,0.75)" }} />
      </View>
    </View>
  );
}

export default function MapScreen({ reports, route, onPin, onWalk }: { reports: PublicReport[]; route: RouteLine | null; onPin: (r: PublicReport) => void; onWalk: (w: Walk) => void }) {
  const { view, setView, flyTo, me, walks } = useApp();
  const cam = useRef<CameraRef>(null);
  const initial = useRef(view);

  useEffect(() => {
    if (flyTo) cam.current?.flyTo({ center: [flyTo.point.lon, flyTo.point.lat], zoom: 14, duration: 900 });
  }, [flyTo?.key]);

  useEffect(() => {
    if (!route?.best.length) return;
    const lons = route.best.map((c) => c[0]);
    const lats = route.best.map((c) => c[1]);
    cam.current?.fitBounds([Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)], { padding: { top: 120, right: 50, bottom: 260, left: 50 }, duration: 800 });
  }, [route]);

  const heat = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: reports
        .filter((r) => !getCategory(r.category)?.welfare)
        .map((r) => ({ type: "Feature" as const, properties: { w: 0.15 + (r.severity / 100) * 0.85 }, geometry: { type: "Point" as const, coordinates: [r.lon, r.lat] } })),
    }),
    [reports],
  );
  const lines = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: route
        ? [
            ...route.others.map((c) => ({ type: "Feature" as const, properties: { best: 0 }, geometry: { type: "LineString" as const, coordinates: c } })),
            { type: "Feature" as const, properties: { best: 1 }, geometry: { type: "LineString" as const, coordinates: route.best } },
          ]
        : [],
    }),
    [route],
  );
  const sorted = useMemo(() => reports.slice().sort((a, b) => a.severity - b.severity), [reports]);

  return (
    <Map
      style={{ flex: 1, backgroundColor: C.mapGrey }}
      mapStyle={MAP_STYLE}
      attribution
      attributionPosition={{ bottom: 8, right: 8 }}
      logo={false}
      compass={false}
      touchRotate={false}
      touchPitch={false}
      onRegionDidChange={(e) => {
        const [lon, lat] = e.nativeEvent.center;
        setView({ lat, lon });
      }}
    >
      <Camera ref={cam} initialViewState={{ center: [initial.current.lon, initial.current.lat], zoom: 13.6 }} minZoom={7} maxZoom={17} />

      <GeoJSONSource id="reports" data={heat}>
        <Layer
          id="heat"
          type="heatmap"
          maxzoom={18}
          paint={{
            "heatmap-weight": ["get", "w"],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 9, 0.8, 15, 2.2],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 9, 16, 13, 48, 16, 96],
            "heatmap-opacity": 0.88,
            "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(0,0,0,0)", 0.12, "rgba(86,120,205,0.32)", 0.35, "rgba(86,120,205,0.5)", 0.55, "rgba(84,66,150,0.6)", 0.75, "rgba(154,34,48,0.85)", 1, "rgba(237,50,40,0.98)"],
          }}
        />
      </GeoJSONSource>

      <GeoJSONSource id="route" data={lines}>
        <Layer
          id="route-line"
          type="line"
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{
            "line-color": ["case", ["==", ["get", "best"], 1], C.cyan, C.muted],
            "line-width": ["case", ["==", ["get", "best"], 1], 5, 3],
            "line-opacity": ["case", ["==", ["get", "best"], 1], 0.95, 0.35],
          }}
        />
      </GeoJSONSource>

      {walks.map((w) => (
        <Marker key={`walk-${w.id}`} id={`walk-${w.id}`} lngLat={[w.lon, w.lat]} onPress={() => onWalk(w)}>
          <View accessibilityLabel={w.team} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderStyle: "dashed", borderColor: C.cyan, backgroundColor: "rgba(56,210,255,0.14)" }} />
        </Marker>
      ))}

      {sorted.map((r) => (
        <Marker key={r.id} id={r.id} lngLat={[r.lon, r.lat]} anchor="bottom" onPress={() => onPin(r)}>
          <View accessible accessibilityRole="button" accessibilityLabel={`${getCategory(r.category)?.label ?? ""}, ${severityLabel(r.severity, getCategory(r.category)?.welfare).toLowerCase()}, ${ago(r.created_at)}`}>
            <Pin r={r} />
          </View>
        </Marker>
      ))}

      {me && (
        <Marker id="me" lngLat={[me.lon, me.lat]}>
          <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: C.cyan, borderWidth: 3, borderColor: "#0b0e16", shadowColor: C.cyan, shadowOpacity: 0.8, shadowRadius: 8 }} />
        </Marker>
      )}
    </Map>
  );
}
