import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import { createApp } from "../server/app";

let base = "";
let app: ReturnType<typeof createApp>;
let clock = Date.parse("2026-11-23T12:00:00Z");

beforeAll(async () => {
  app = createApp({ dbPath: ":memory:", adminToken: "admintoken", now: () => clock });
  await new Promise<void>((r) => app.server.listen(0, r));
  base = `http://localhost:${(app.server.address() as AddressInfo).port}/api`;
});
afterAll(() => app.close());

async function session() {
  const { token } = await (await fetch(`${base}/session`, { method: "POST" })).json();
  return token as string;
}
function post(path: string, token: string, body?: unknown) {
  return fetch(base + path, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });
}
const report = { type: "situation", category: "inbraakpoging", severity: 80, lat: 52.360612, lon: 4.927634, note: "geheime notitie" };

describe("api", () => {
  let a = "";
  let id = "";

  it("requires a session to report", async () => {
    expect((await fetch(`${base}/reports`, { method: "POST", body: "{}" })).status).toBe(401);
  });

  it("fuzzes, stores and returns only public fields", async () => {
    a = await session();
    const res = await post("/reports", a, report);
    expect(res.status).toBe(200);
    const out = await res.json();
    expect(out.status).toBe("approved");
    id = out.report.id;
    expect(Object.keys(out.report).sort()).toEqual(["category", "confirmations", "created_at", "expires_at", "id", "lat", "lon", "severity", "type"]);
    expect(out.report.lat).not.toBe(report.lat);
    const pins = await (await fetch(`${base}/pins`)).json();
    expect(pins).toHaveLength(1);
    expect(JSON.stringify(pins)).not.toContain("geheime");
  });

  it("rate limits the same cell", async () => {
    const res = await post("/reports", a, { ...report, category: "overlast" });
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe("rate_limited");
  });

  it("refuses locations outside the Netherlands and bad categories", async () => {
    const b = await session();
    expect((await (await post("/reports", b, { ...report, lat: 48.85, lon: 2.35 })).json()).error).toBe("outside_area");
    expect((await (await post("/reports", b, { ...report, type: "incident" })).json()).error).toBe("invalid");
  });

  it("counts confirmations once and not from the reporter", async () => {
    const b = await session();
    expect((await (await post(`/reports/${id}/confirm`, b)).json()).ok).toBe(true);
    expect((await (await post(`/reports/${id}/confirm`, b)).json()).ok).toBe(false);
    expect((await (await post(`/reports/${id}/confirm`, a)).json()).ok).toBe(false);
    const [pin] = await (await fetch(`${base}/pins`)).json();
    expect(pin.confirmations).toBe(1);
  });

  it("hides a pin after three flags and lets moderation restore it", async () => {
    for (let i = 0; i < 3; i++) await post(`/reports/${id}/flag`, await session(), { reason: "spam" });
    expect(await (await fetch(`${base}/pins`)).json()).toHaveLength(0);
    expect((await fetch(`${base}/admin/reports`)).status).toBe(401);
    const pending = await (await fetch(`${base}/admin/reports?status=pending`, { headers: { authorization: "Bearer admintoken" } })).json();
    expect(pending[0].note).toBe("geheime notitie");
    expect(pending[0].reporter_id).toBeUndefined();
    await fetch(`${base}/admin/reports/${id}`, { method: "POST", headers: { authorization: "Bearer admintoken" }, body: JSON.stringify({ status: "approved" }) });
    expect(await (await fetch(`${base}/pins`)).json()).toHaveLength(1);
  });

  it("expires pins and wipes notes", async () => {
    clock += 13 * 3_600_000;
    expect(await (await fetch(`${base}/pins`)).json()).toHaveLength(0);
    app.purge();
    const row = app.db.prepare("select note from reports where id = ?").get(id) as { note: string | null };
    expect(row.note).toBeNull();
  });
});
