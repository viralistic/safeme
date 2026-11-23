// Demo mode: runs fully on this device, no backend. Mirrors the server rules
// (fuzzing, expiry, rate limits, no public notes) so the UX is honest.

import { CATEGORIES, getCategory } from "./categories";
import { fuzz, inNetherlands, distanceM, type LatLon } from "./fuzz";
import type { FlagReason, NewReport, PublicReport, ReportStore, SubmitResult } from "./types";

const KEY = "sm.demo.reports";
const OWN = "sm.demo.own";
const CONFIRMED = "sm.demo.confirmed";
const FLAGGED = "sm.demo.flagged";

interface Stored extends PublicReport {
  flags: number;
}

// Falls back to memory when storage is blocked (private windows, sandboxed frames).
const memory = new Map<string, string>();

function read<T>(key: string, fallback: T): T {
  let v: string | null | undefined;
  try {
    v = localStorage.getItem(key);
  } catch {
    v = memory.get(key);
  }
  return v ? (JSON.parse(v) as T) : fallback;
}

function write(key: string, v: unknown) {
  const s = JSON.stringify(v);
  memory.set(key, s);
  try {
    localStorage.setItem(key, s);
  } catch {}
}

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Small deterministic PRNG so the seed looks the same on every load. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export function seedAround(center: LatLon, now = Date.now()): Stored[] {
  const rand = rng(Math.round(center.lat * 1000) * 7 + Math.round(center.lon * 1000));
  const hotspots = [
    { dx: 0.004, dy: -0.002, n: 5, sev: 78 },
    { dx: -0.009, dy: 0.006, n: 3, sev: 52 },
    { dx: 0.011, dy: 0.008, n: 2, sev: 22 },
    { dx: -0.004, dy: -0.011, n: 2, sev: 18 },
    { dx: 0.016, dy: -0.009, n: 2, sev: 60 },
  ];
  const out: Stored[] = [];
  for (const h of hotspots) {
    for (let i = 0; i < h.n; i++) {
      const cats = CATEGORIES.filter((c) => !c.welfare);
      const cat = cats[Math.floor(rand() * cats.length)];
      const ageMin = Math.floor(rand() * Math.min(cat.ttlMinutes * 0.8, 150)) + 2;
      const created = now - ageMin * 60_000;
      const p = fuzz({
        lat: center.lat + h.dy + (rand() - 0.5) * 0.003,
        lon: center.lon + h.dx + (rand() - 0.5) * 0.004,
      });
      out.push({
        id: uid(),
        type: cat.type,
        category: cat.id,
        severity: Math.max(0, Math.min(100, Math.round(h.sev + (rand() - 0.5) * 24))),
        ...p,
        created_at: new Date(created).toISOString(),
        expires_at: new Date(created + cat.ttlMinutes * 60_000).toISOString(),
        confirmations: Math.floor(rand() * 4),
        flags: 0,
      });
    }
  }
  const welfare = CATEGORIES.find((c) => c.welfare)!;
  const wp = fuzz({ lat: center.lat - 0.006, lon: center.lon + 0.007 });
  out.push({
    id: uid(),
    type: welfare.type,
    category: welfare.id,
    severity: 45,
    ...wp,
    created_at: new Date(now - 9 * 60_000).toISOString(),
    expires_at: new Date(now + 51 * 60_000).toISOString(),
    confirmations: 1,
    flags: 0,
  });
  return out;
}

function toPublic({ flags: _f, ...r }: Stored): PublicReport {
  return r;
}

export function createDemoStore(getCenter: () => LatLon): ReportStore {
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  function all(): Stored[] {
    const now = Date.now();
    let reports = read<Stored[]>(KEY, []);
    const live = reports.filter((r) => new Date(r.expires_at).getTime() > now);
    if (live.length === 0) {
      reports = seedAround(getCenter(), now);
      write(KEY, reports);
      return reports;
    }
    if (live.length !== reports.length) write(KEY, live);
    return live;
  }

  return {
    mode: "demo",

    async list() {
      return all()
        .filter((r) => r.flags < 3)
        .map(toPublic);
    },

    async submit(input: NewReport): Promise<SubmitResult> {
      const cat = getCategory(input.category);
      if (!cat || cat.type !== input.type) return { ok: false, error: "invalid" };
      if (!inNetherlands(input)) return { ok: false, error: "outside_area" };

      const point = fuzz(input);
      const now = Date.now();
      const reports = all();
      const own = read<{ id: string; at: number; lat: number; lon: number }[]>(OWN, []);
      const lastHour = own.filter((o) => now - o.at < 3_600_000);
      const sameCell = own.some((o) => now - o.at < 1_800_000 && distanceM(o, point) < 1);
      if (lastHour.length >= 5 || sameCell) return { ok: false, error: "rate_limited" };

      const report: Stored = {
        id: uid(),
        type: input.type,
        category: input.category,
        severity: input.severity,
        ...point,
        created_at: new Date(now).toISOString(),
        expires_at: new Date(now + cat.ttlMinutes * 60_000).toISOString(),
        confirmations: 0,
        flags: 0,
      };
      // Notes are for moderation only and are not kept in demo mode.
      write(KEY, [...reports, report]);
      write(OWN, [...own, { id: report.id, at: now, ...point }]);
      emit();
      return { ok: true, status: "approved", report: toPublic(report) };
    },

    async confirm(id) {
      const done = read<string[]>(CONFIRMED, []);
      if (done.includes(id) || this.isOwn(id)) return false;
      write(KEY, all().map((r) => (r.id === id ? { ...r, confirmations: r.confirmations + 1 } : r)));
      write(CONFIRMED, [...done, id]);
      emit();
      return true;
    },

    async flag(id, _reason: FlagReason) {
      const done = read<string[]>(FLAGGED, []);
      if (done.includes(id)) return false;
      write(KEY, all().map((r) => (r.id === id ? { ...r, flags: r.flags + 1 } : r)));
      write(FLAGGED, [...done, id]);
      emit();
      return true;
    },

    hasConfirmed(id) {
      return read<string[]>(CONFIRMED, []).includes(id);
    },

    isOwn(id) {
      return read<{ id: string }[]>(OWN, []).some((o) => o.id === id);
    },

    subscribe(fn) {
      listeners.add(fn);
      const onStorage = (e: StorageEvent) => e.key === KEY && fn();
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(fn);
        window.removeEventListener("storage", onStorage);
      };
    },

    async reset() {
      [KEY, OWN, CONFIRMED, FLAGGED].forEach((k) => {
        memory.delete(k);
        try {
          localStorage.removeItem(k);
        } catch {}
      });
      emit();
    },
  };
}
