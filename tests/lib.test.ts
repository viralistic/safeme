import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fuzz, distanceM, inNetherlands } from "../src/lib/fuzz";
import { level, severityLabel } from "../src/lib/severity";
import { CATEGORIES } from "../src/lib/categories";
import { shortDuration } from "../src/lib/time";

describe("fuzz", () => {
  it("snaps to a cell center within ~71m and is stable per cell", () => {
    const p = { lat: 52.360612, lon: 4.927634 };
    const f = fuzz(p);
    expect(distanceM(p, f)).toBeLessThan(72);
    expect(fuzz({ lat: p.lat + 0.00002, lon: p.lon - 0.00002 })).toEqual(f);
    expect(fuzz(f)).toEqual(f);
  });
  it("knows the Netherlands", () => {
    expect(inNetherlands({ lat: 52.37, lon: 4.9 })).toBe(true);
    expect(inNetherlands({ lat: 48.85, lon: 2.35 })).toBe(false);
  });
});

describe("severity", () => {
  it("maps the spectrum to labels", () => {
    expect(level(0)).toBe("low");
    expect(level(50)).toBe("mid");
    expect(level(90)).toBe("high");
    expect(severityLabel(90)).toBe("Direct gevaar");
    expect(severityLabel(90, true)).toBe("Direct hulp nodig");
  });
});

describe("categories", () => {
  it("has the five situations from the spec and one welfare signal", () => {
    expect(CATEGORIES.filter((c) => c.type === "situation").map((c) => c.label)).toEqual([
      "Drugsgebruik",
      "Overlast",
      "Inbraakpoging",
      "Iemand in nood",
      "Onveilig gevoel",
    ]);
    expect(CATEGORIES.filter((c) => c.welfare)).toHaveLength(1);
  });
});

describe("time", () => {
  it("formats durations in Dutch", () => {
    expect(shortDuration(0)).toBe("net");
    expect(shortDuration(12)).toBe("12 min");
    expect(shortDuration(180)).toBe("3 uur");
    expect(shortDuration(60 * 48)).toBe("2 dagen");
  });
});

describe("copy rules", () => {
  const files: string[] = [];
  const walk = (d: string) =>
    readdirSync(d).forEach((f) => {
      const p = join(d, f);
      statSync(p).isDirectory() ? walk(p) : /\.(tsx?|astro|css|js|webmanifest)$/.test(p) && files.push(p);
    });
  walk("src");
  walk("server");
  walk("public");

  it("has no em dashes and no emoji", () => {
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      expect(text.includes("—"), `${f} contains an em dash`).toBe(false);
      expect(/(?![\u00a9\u00ae\u2122])\p{Extended_Pictographic}/u.test(text), `${f} contains an emoji`).toBe(false);
    }
  });
});
