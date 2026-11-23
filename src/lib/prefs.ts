import type { LatLon } from "./fuzz";

export interface AlertPrefs {
  push: boolean;
  onlyHigh: boolean;
  radiusM: 500 | 1000 | 2000;
  area: LatLon | null;
  areaName: string | null;
}

const KEY = "sm.prefs";
const DEFAULTS: AlertPrefs = { push: false, onlyHigh: false, radiusM: 1000, area: null, areaName: null };

export function loadPrefs(): AlertPrefs {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

export function savePrefs(p: AlertPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}

export function clearLocal(): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("sm."))
      .forEach((k) => localStorage.removeItem(k));
  } catch {}
}
