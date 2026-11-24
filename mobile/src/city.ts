// Native copy of src/lib/city.ts (same shape). Shared modules that import
// "./city" get this file in the app (see metro.config.js).
import type { LatLon } from "../../src/lib/fuzz";

function point(v?: string): LatLon | null {
  const m = v?.match(/^\s*([\d.]+)\s*,\s*([\d.]+)\s*$/);
  return m ? { lat: Number(m[1]), lon: Number(m[2]) } : null;
}

export const CITY = {
  name: process.env.EXPO_PUBLIC_CITY_NAME || "Amsterdam",
  center: point(process.env.EXPO_PUBLIC_CITY_CENTER) ?? { lat: 52.3606, lon: 4.9276 },
  reportUrl: process.env.EXPO_PUBLIC_CITY_REPORT_URL || "https://meldingen.amsterdam.nl",
  statsUrl: process.env.EXPO_PUBLIC_CITY_STATS_URL || "https://onderzoek.amsterdam.nl/artikel/openbare-orde-en-veiligheid-in-cijfers-2026",
  routingUrl: process.env.EXPO_PUBLIC_ROUTING_URL || "https://routing.openstreetmap.de/routed-foot",
};

/** The Safety Map server, for example https://safetymap.nl/api. Empty: demo mode on the phone. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");
export const MAP_STYLE = process.env.EXPO_PUBLIC_MAP_STYLE || "https://tiles.openfreemap.org/styles/dark";
/** Where the web version lives, for /cijfers and the partner portal. */
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL || API_URL.replace(/\/api$/, "")).replace(/\/$/, "");
