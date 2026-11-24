import { describe, expect, it } from "vitest";
import { distanceToLine, pickRoute, scoreRoute } from "../src/lib/route";
import type { PublicReport } from "../src/lib/types";

const pin = (lat: number, lon: number, severity: number, category = "overlast"): PublicReport => ({
  id: String(lat), type: "situation", category, severity, lat, lon, created_at: "", expires_at: "", confirmations: 0,
});

describe("route choice", () => {
  const straight: [number, number][] = [[4.90, 52.36], [4.92, 52.36]];
  const detour: [number, number][] = [[4.90, 52.36], [4.91, 52.362], [4.92, 52.36]];

  it("measures distance to a line in meters", () => {
    expect(distanceToLine({ lat: 52.36, lon: 4.91 }, straight)).toBeLessThan(1);
    expect(Math.round(distanceToLine({ lat: 52.3609, lon: 4.91 }, straight))).toBeGreaterThan(95);
  });

  it("counts only danger near the route, not help signals or mild reports", () => {
    const reports = [pin(52.36, 4.91, 80), pin(52.36, 4.912, 20), pin(52.36, 4.915, 70, "iemand-in-nood")];
    expect(scoreRoute(straight, reports)).toEqual({ passes: 1, score: 80 });
  });

  it("prefers the calmer route unless it is much longer", () => {
    const a = { coords: straight, meters: 1000, seconds: 700, passes: 2, score: 150 };
    const b = { coords: detour, meters: 1200, seconds: 850, passes: 0, score: 0 };
    const c = { coords: detour, meters: 2000, seconds: 1400, passes: 0, score: 0 };
    expect(pickRoute([a, b])).toBe(b);
    expect(pickRoute([a, c])).toBe(a);
  });
});
