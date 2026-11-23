// Location fuzzing. The server is the authority (see supabase/migrations), this
// mirrors it so demo mode and the UI never hold a precise point either.

export const GRID_METERS = 100;
const M_PER_DEG_LAT = 111_320;

export interface LatLon {
  lat: number;
  lon: number;
}

function round(n: number, d = 6): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

/** Snap a point to the center of its ~100m grid cell. Deterministic per cell. */
export function fuzz({ lat, lon }: LatLon, gridM = GRID_METERS): LatLon {
  const dLat = gridM / M_PER_DEG_LAT;
  const latC = (Math.floor(lat / dLat) + 0.5) * dLat;
  const dLon = gridM / (M_PER_DEG_LAT * Math.cos((latC * Math.PI) / 180));
  const lonC = (Math.floor(lon / dLon) + 0.5) * dLon;
  return { lat: round(latC), lon: round(lonC) };
}

/** Rough bounding box of the Netherlands. Reports outside it are refused. */
export const NL_BOUNDS = { minLat: 50.7, maxLat: 53.7, minLon: 3.2, maxLon: 7.3 };

export function inNetherlands({ lat, lon }: LatLon): boolean {
  return lat >= NL_BOUNDS.minLat && lat <= NL_BOUNDS.maxLat && lon >= NL_BOUNDS.minLon && lon <= NL_BOUNDS.maxLon;
}

/** Haversine distance in meters. */
export function distanceM(a: LatLon, b: LatLon): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
