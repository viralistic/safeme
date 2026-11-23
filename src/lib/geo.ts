import { fuzz, type LatLon } from "./fuzz";

/** Default view: Amsterdam Oost. */
export const DEFAULT_CENTER: LatLon = { lat: 52.3606, lon: 4.9276 };

export type LocationSource = "device" | "map";

/** Ask the device for a position. Resolves null when denied or unavailable. */
export function getDevicePosition(timeoutMs = 8000): Promise<LatLon | null> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

// We only ever keep a fuzzed position on the device.
const KEY = "sm.lastArea";

export function rememberArea(p: LatLon): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(fuzz(p, 500)));
  } catch {}
}

export function lastArea(): LatLon | null {
  try {
    const v = localStorage.getItem(KEY);
    return v ? (JSON.parse(v) as LatLon) : null;
  } catch {
    return null;
  }
}

interface PdokDoc {
  id: string;
  weergavenaam: string;
  type: string;
  centroide_ll?: string;
}

function parsePoint(wkt?: string): LatLon | null {
  const m = wkt?.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
  return m ? { lon: Number(m[1]), lat: Number(m[2]) } : null;
}

const PDOK = "https://api.pdok.nl/bzk/locatieserver/search/v3_1";

export interface Place {
  id: string;
  name: string;
  type: string;
}

/** Place search via PDOK Locatieserver (Dutch government, no key, no tracking). */
export async function searchPlaces(q: string, signal?: AbortSignal): Promise<Place[]> {
  if (q.trim().length < 2) return [];
  const url = `${PDOK}/suggest?rows=6&fq=type:(gemeente OR woonplaats OR wijk OR buurt OR weg OR postcode)&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.response?.docs ?? []).map((d: PdokDoc) => ({ id: d.id, name: d.weergavenaam, type: d.type }));
}

export async function lookupPlace(id: string): Promise<LatLon | null> {
  const res = await fetch(`${PDOK}/lookup?fl=centroide_ll&id=${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return parsePoint(data.response?.docs?.[0]?.centroide_ll);
}

/** Neighbourhood name for an area, e.g. "Oost, Amsterdam". */
export async function areaName(p: LatLon): Promise<string | null> {
  try {
    const res = await fetch(`${PDOK}/reverse?type=wijk&rows=1&fl=wijknaam,gemeentenaam&lat=${p.lat}&lon=${p.lon}`);
    if (!res.ok) return null;
    const d = (await res.json()).response?.docs?.[0];
    if (!d) return null;
    const wijk = String(d.wijknaam ?? "").replace(/^Wijk \d+\s*/i, "");
    return wijk ? `${wijk}, ${d.gemeentenaam}` : d.gemeentenaam ?? null;
  } catch {
    return null;
  }
}
