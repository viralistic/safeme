import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import { createApp } from "../server/app";

let app: ReturnType<typeof createApp>;
let base = "";

beforeAll(async () => {
  app = createApp({ dbPath: ":memory:", moderator: { email: "mod@example.nl", password: "moderator-secret" } });
  await new Promise<void>((r) => app.server.listen(0, r));
  base = `http://localhost:${(app.server.address() as AddressInfo).port}/api`;
});
afterAll(() => app.close());

const json = (method: string, path: string, body?: unknown, token?: string) =>
  fetch(base + path, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });

async function reporter() {
  return (await (await fetch(`${base}/session`, { method: "POST" })).json()).token as string;
}

describe("partner accounts", () => {
  let mod = "";
  let police = "";
  let team = "";

  it("logs the first moderator in", async () => {
    const res = await json("POST", "/partner/login", { email: "mod@example.nl", password: "moderator-secret" });
    expect(res.status).toBe(200);
    mod = (await res.json()).token;
    expect((await json("POST", "/partner/login", { email: "mod@example.nl", password: "wrong" })).status).toBe(401);
  });

  it("only lets politie.nl addresses ask for a police account, and holds them for approval", async () => {
    expect((await (await json("POST", "/partner/signup", { email: "a@gmail.com", password: "long-password-1", name: "X", role: "police" })).json()).error).toBe("police_domain");
    const res = await json("POST", "/partner/signup", { email: "wijk@politie.nl", password: "long-password-1", name: "Team Oost", role: "police" });
    expect((await res.json()).status).toBe("pending");
    expect((await (await json("POST", "/partner/login", { email: "wijk@politie.nl", password: "long-password-1" })).json()).error).toBe("pending");
    const accounts = await (await json("GET", "/partner/accounts", undefined, mod)).json();
    const p = accounts.find((a: { email: string }) => a.email === "wijk@politie.nl");
    await json("POST", `/partner/accounts/${p.id}`, { status: "active" }, mod);
    police = (await (await json("POST", "/partner/login", { email: "wijk@politie.nl", password: "long-password-1" })).json()).token;
    expect(police).toBeTruthy();
  });

  it("lets a buurtteam join with an invite code once", async () => {
    const { code } = await (await json("POST", "/partner/invites", { role: "buurtteam" }, mod)).json();
    const res = await (await json("POST", "/partner/signup", { email: "team@buurt.nl", password: "long-password-2", name: "Buurtteam Dapperbuurt", role: "buurtteam", invite: code })).json();
    expect(res.status).toBe("active");
    team = res.token;
    expect((await (await json("POST", "/partner/signup", { email: "b@buurt.nl", password: "long-password-2", name: "B", role: "buurtteam", invite: code })).json()).error).toBe("invite");
    expect((await json("GET", "/partner/queue", undefined, team)).status).toBe(403);
  });

  it("keeps private signals off the public map until two people report the same place", async () => {
    const r = { type: "situation", category: "uitbuiting", severity: 60, lat: 52.3601, lon: 4.9301 };
    const first = await (await json("POST", "/reports", r, await reporter())).json();
    expect(first.status).toBe("private");
    expect(await (await fetch(`${base}/pins`)).json()).toHaveLength(0);
    let map = await (await json("GET", "/partner/map", undefined, police)).json();
    expect(map.signals).toHaveLength(0);
    await json("POST", "/reports", { ...r, lat: 52.36012 }, await reporter());
    map = await (await json("GET", "/partner/map", undefined, police)).json();
    expect(map.signals).toHaveLength(1);
    expect(map.signals[0].reporters).toBe(2);
    expect(JSON.stringify(map)).not.toContain("reporter_id");
    const teamMap = await (await json("GET", "/partner/map", undefined, team)).json();
    expect(teamMap.signals).toHaveLength(0);
  });

  it("stores the hate tag privately for incidents", async () => {
    const out = await (await json("POST", "/reports", { type: "incident", category: "nageroepen", severity: 50, lat: 52.365, lon: 4.91, hate: true }, await reporter())).json();
    const pin = (await (await fetch(`${base}/pins`)).json()).find((p: { id: string }) => p.id === out.report.id);
    expect(pin.hate).toBeUndefined();
    const map = await (await json("GET", "/partner/map", undefined, police)).json();
    expect(map.reports.find((p: { id: string }) => p.id === out.report.id).hate).toBe(true);
  });

  it("shows a buurtteam walk on the public map", async () => {
    await json("POST", "/partner/walks", { lat: 52.3615, lon: 4.9255, hours: 2 }, team);
    const walks = await (await fetch(`${base}/walks`)).json();
    expect(walks[0].team).toBe("Buurtteam Dapperbuurt");
    expect((await json("POST", "/partner/walks", { lat: 52.36, lon: 4.92 }, police)).status).toBe(403);
  });
});
