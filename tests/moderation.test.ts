import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { moderateNote, ruleCheck } from "../server/moderation";
import { createApp } from "../server/app";

describe("rule check", () => {
  it("lets behaviour and places through", () => {
    expect(ruleCheck("Iemand probeert fietsen open te breken bij de brug").verdict).toBe("ok");
  });
  it("strips notes that describe who someone is", () => {
    const r = ruleCheck("Man met capuchon en baard, Marokkaans uiterlijk");
    expect(r.verdict).toBe("strip_note");
    expect(r.reasons).toContain("afkomst");
  });
  it("sends abuse and contact details to review", () => {
    expect(ruleCheck("Bel 0612345678").verdict).toBe("review");
    expect(ruleCheck("auto met kenteken AB-123-C").verdict).toBe("review");
  });
});

describe("AI first pass", () => {
  it("takes the stricter verdict and survives a broken model", async () => {
    const fakeFetch = (async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: '{"verdict":"review","reasons":["lijkt wraak"]}' } }] }))) as typeof fetch;
    const r = await moderateNote("Overlast bij de ingang", { url: "http://ai.local/v1", model: "m" }, fakeFetch);
    expect(r).toMatchObject({ verdict: "review", by: "rules+ai" });
    const broken = (async () => new Response("nope", { status: 500 })) as typeof fetch;
    expect((await moderateNote("Overlast", { url: "http://ai.local/v1", model: "m" }, broken)).by).toBe("rules");
  });
});

describe("api moderation and tiles", () => {
  let app: ReturnType<typeof createApp>;
  let base = "";
  const tiles = mkdtempSync(join(tmpdir(), "sm-tiles-"));
  writeFileSync(join(tiles, "test.pmtiles"), Buffer.from("0123456789"));

  beforeAll(async () => {
    app = createApp({ dbPath: ":memory:", adminToken: "t", tilesDir: tiles });
    await new Promise<void>((r) => app.server.listen(0, r));
    base = `http://localhost:${(app.server.address() as AddressInfo).port}`;
  });
  afterAll(() => app.close());

  async function report(note: string, lat: number) {
    const { token } = await (await fetch(`${base}/api/session`, { method: "POST" })).json();
    const res = await fetch(`${base}/api/reports`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ type: "situation", category: "overlast", severity: 40, lat, lon: 4.92, note }),
    });
    return res.json();
  }

  it("drops a note that describes a person but keeps the report", async () => {
    const out = await report("jongen met hoofddoek schreeuwt", 52.36);
    expect(out.status).toBe("approved");
    const row = app.db.prepare("select note, moderation from reports where id = ?").get(out.report.id) as { note: string | null; moderation: string };
    expect(row.note).toBeNull();
    expect(JSON.parse(row.moderation).verdict).toBe("strip_note");
  });

  it("holds an abusive report for review", async () => {
    const out = await report("bel hem op 0612345678", 52.37);
    expect(out.status).toBe("pending");
  });

  it("serves tile files with range requests", async () => {
    const res = await fetch(`${base}/tiles/test.pmtiles`, { headers: { range: "bytes=2-5" } });
    expect(res.status).toBe(206);
    expect(await res.text()).toBe("2345");
    expect((await fetch(`${base}/tiles/../package.json`)).status).toBe(404);
  });
});
