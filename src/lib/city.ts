// One codebase, any Dutch city: set these at build time for another city.
// The native app has its own copy of this file (mobile/src/city.ts) with the same shape.
import type { LatLon } from "./fuzz";

function point(v?: string): LatLon | null {
  const m = v?.match(/^\s*([\d.]+)\s*,\s*([\d.]+)\s*$/);
  return m ? { lat: Number(m[1]), lon: Number(m[2]) } : null;
}

export const CITY = {
  name: import.meta.env.PUBLIC_CITY_NAME || "Amsterdam",
  /** Default map centre, "lat,lon". Amsterdam Oost by default. */
  center: point(import.meta.env.PUBLIC_CITY_CENTER) ?? { lat: 52.3606, lon: 4.9276 },
  /** The city's own public space reporting, for dark spots and broken lamps. */
  reportUrl: import.meta.env.PUBLIC_CITY_REPORT_URL || "https://meldingen.amsterdam.nl",
  /** Official safety figures for this city. */
  statsUrl: import.meta.env.PUBLIC_CITY_STATS_URL || "https://onderzoek.amsterdam.nl/artikel/openbare-orde-en-veiligheid-in-cijfers-2026",
  /** OSRM-compatible routing for walking routes. Default: FOSSGIS in Germany; self-host for full control. */
  routingUrl: import.meta.env.PUBLIC_ROUTING_URL || "https://routing.openstreetmap.de/routed-foot",
};
