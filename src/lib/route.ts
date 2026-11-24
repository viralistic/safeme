// Route choice: ask a routing engine (OSRM API) for walking alternatives and
// pick the one that passes the fewest recent danger reports.

import { getCategory } from "./categories";
import type { LatLon } from "./fuzz";
import type { PublicReport } from "./types";

/** OSRM-compatible base URL. Default: FOSSGIS in Germany; self-host for full control. */
export const ROUTING_URL = import.meta.env.PUBLIC_ROUTING_URL || "https://routing.openstreetmap.de/routed-foot";

export interface ScoredRoute {
  coords: [number, number][];
  meters: number;
  seconds: number;
  /** Danger reports within 80 m of the route. */
  passes: number;
  score: number;
}

const NEAR_M = 80;

/** Distance in meters from a point to a polyline, flat-earth approximation (fine at city scale). */
export function distanceToLine(p: LatLon, coords: [number, number][]): number {
  const kx = 111_320 * Math.cos((p.lat * Math.PI) / 180);
  const ky = 110_540;
  let best = Infinity;
  for (let i = 0; i < coords.length - 1; i++) {
    const ax = (coords[i][0] - p.lon) * kx, ay = (coords[i][1] - p.lat) * ky;
    const bx = (coords[i + 1][0] - p.lon) * kx, by = (coords[i + 1][1] - p.lat) * ky;
    const dx = bx - ax, dy = by - ay;
    const len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len)) : 0;
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  if (coords.length === 1) best = Math.hypot((coords[0][0] - p.lon) * kx, (coords[0][1] - p.lat) * ky);
  return best;
}

export function scoreRoute(coords: [number, number][], reports: PublicReport[]): { passes: number; score: number } {
  let passes = 0;
  let score = 0;
  for (const r of reports) {
    if (getCategory(r.category)?.welfare || r.severity < 34) continue;
    if (distanceToLine(r, coords) <= NEAR_M) {
      passes++;
      score += r.severity;
    }
  }
  return { passes, score };
}

/** Lowest danger first; among equals, the shorter walk. A route up to 30% longer may win. */
export function pickRoute(routes: ScoredRoute[]): ScoredRoute | null {
  if (!routes.length) return null;
  const shortest = Math.min(...routes.map((r) => r.meters));
  const ok = routes.filter((r) => r.meters <= shortest * 1.3);
  return ok.sort((a, b) => a.score - b.score || a.meters - b.meters)[0];
}

export async function findRoutes(from: LatLon, to: LatLon, reports: PublicReport[]): Promise<ScoredRoute[]> {
  const url = `${ROUTING_URL.replace(/\/$/, "")}/route/v1/foot/${from.lon},${from.lat};${to.lon},${to.lat}?alternatives=3&overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("routing");
  const data = await res.json();
  return (data.routes ?? []).map((r: { geometry: { coordinates: [number, number][] }; distance: number; duration: number }) => ({
    coords: r.geometry.coordinates,
    meters: r.distance,
    seconds: r.duration,
    ...scoreRoute(r.geometry.coordinates, reports),
  }));
}
