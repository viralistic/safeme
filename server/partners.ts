// Accounts for police, buurtteams and moderators. Partners see more of the map,
// never who reported. Passwords are scrypt hashes; sessions are random tokens
// stored as hashes.

import type { DatabaseSync } from "node:sqlite";
import type { IncomingMessage } from "node:http";
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { HttpError } from "./http.ts";
import { fuzz, inNetherlands } from "../src/lib/fuzz.ts";
import { getCategory } from "../src/lib/categories.ts";

export type Role = "police" | "buurtteam" | "moderator";
type Status = "pending" | "approved" | "removed";

export interface PartnerDeps {
  db: DatabaseSync;
  now: () => number;
  body: (req: IncomingMessage) => Promise<Record<string, unknown>>;
  emit: () => void;
  setReportStatus: (id: string, status: Status, confidence?: number) => void;
  alert: (text: string) => void;
  /** Domain a police sign-up must use. */
  policeDomain: string;
  /** Time zone for "hour of day" charts. */
  timeZone: string;
}

const DAY = 86_400_000;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export function migratePartners(db: DatabaseSync) {
  db.exec(`
    create table if not exists accounts (
      id text primary key,
      email text not null unique,
      name text not null,
      role text not null check (role in ('police','buurtteam','moderator')),
      password text not null,
      status text not null check (status in ('pending','active','disabled')),
      created_at integer not null
    );
    create table if not exists partner_sessions (
      token_hash text primary key,
      account_id text not null references accounts(id) on delete cascade,
      expires_at integer not null
    );
    create table if not exists invites (
      code text primary key,
      role text not null,
      created_by text not null,
      used_by text,
      expires_at integer not null
    );
    create table if not exists walks (
      id text primary key,
      account_id text not null references accounts(id) on delete cascade,
      team text not null,
      lat real not null,
      lon real not null,
      started_at integer not null,
      ends_at integer not null
    );
  `);
}

export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 32).toString("hex")}`;
}

function checkPassword(pw: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const a = Buffer.from(hash, "hex");
  const b = scryptSync(pw, salt, 32);
  return a.length === b.length && timingSafeEqual(a, b);
}

interface Account {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: "pending" | "active" | "disabled";
}

/** Create the first moderator from the server's environment, once. */
export function ensureModerator(db: DatabaseSync, email: string, password: string, now: number) {
  const e = email.trim().toLowerCase();
  if (db.prepare("select 1 from accounts where email = ?").get(e)) return;
  db.prepare("insert into accounts (id, email, name, role, password, status, created_at) values (?,?,?,?,?,?,?)").run(randomUUID(), e, "Moderatie", "moderator", hashPassword(password), "active", now);
}

export function createPartnerRoutes(d: PartnerDeps) {
  const { db, now } = d;

  function account(req: IncomingMessage, roles?: Role[]): Account {
    const m = String(req.headers.authorization ?? "").match(/^Bearer (\S+)$/);
    if (!m) throw new HttpError(401, "auth_required");
    const a = db
      .prepare("select a.id, a.email, a.name, a.role, a.status from partner_sessions s join accounts a on a.id = s.account_id where s.token_hash = ? and s.expires_at > ?")
      .get(sha(m[1]), now()) as Account | undefined;
    if (!a || a.status !== "active") throw new HttpError(401, "auth_required");
    if (roles && !roles.includes(a.role)) throw new HttpError(403, "forbidden");
    return a;
  }

  function session(a: { id: string }) {
    const token = randomBytes(32).toString("base64url");
    db.prepare("insert into partner_sessions (token_hash, account_id, expires_at) values (?,?,?)").run(sha(token), a.id, now() + 30 * DAY);
    return token;
  }

  const iso = (n: number) => new Date(n).toISOString();

  /** Private signals become visible once two different people reported the same place within 7 days. */
  function privateSignals() {
    const rows = db
      .prepare(
        `select category, lat, lon, count(distinct reporter_id) as reporters, count(*) as reports, min(created_at) as first, max(created_at) as last
         from reports where private = 1 and status = 'approved' and created_at > ?
         group by category, lat, lon having count(distinct reporter_id) >= 2 order by last desc`,
      )
      .all(now() - 7 * DAY) as Record<string, number | string>[];
    return rows.map((r) => ({ ...r, first: iso(r.first as number), last: iso(r.last as number) }));
  }

  return async function route(req: IncomingMessage, path: string, method: string, seg: string[]): Promise<unknown> {
    // ------------------------------------------------------------ public
    if (method === "POST" && path === "/api/partner/signup") {
      const b = await d.body(req);
      const email = String(b.email ?? "").trim().toLowerCase();
      const password = String(b.password ?? "");
      const name = String(b.name ?? "").trim().slice(0, 60);
      const role = String(b.role ?? "") as Role;
      if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(email) || password.length < 10 || !name) throw new HttpError(422, "invalid");
      if (db.prepare("select 1 from accounts where email = ?").get(email)) throw new HttpError(409, "exists");
      let status: Account["status"];
      if (role === "police") {
        if (!email.endsWith(`@${d.policeDomain}`)) throw new HttpError(422, "police_domain");
        status = "pending";
      } else if (role === "buurtteam" || role === "moderator") {
        const code = String(b.invite ?? "").trim().toUpperCase();
        const inv = db.prepare("select * from invites where code = ? and role = ? and used_by is null and expires_at > ?").get(code, role, now());
        if (!inv) throw new HttpError(422, "invite");
        status = "active";
      } else throw new HttpError(422, "invalid");
      const id = randomUUID();
      db.prepare("insert into accounts (id, email, name, role, password, status, created_at) values (?,?,?,?,?,?,?)").run(id, email, name, role, hashPassword(password), status, now());
      if (role !== "police") db.prepare("update invites set used_by = ? where code = ?").run(id, String(b.invite).trim().toUpperCase());
      if (status === "pending") d.alert(`Nieuwe politie-aanvraag wacht op goedkeuring: ${name}`);
      return status === "active" ? { status, token: session({ id }), role, name } : { status };
    }

    if (method === "POST" && path === "/api/partner/login") {
      const b = await d.body(req);
      const a = db.prepare("select * from accounts where email = ?").get(String(b.email ?? "").trim().toLowerCase()) as (Account & { password: string }) | undefined;
      if (!a || !checkPassword(String(b.password ?? ""), a.password)) throw new HttpError(401, "login");
      if (a.status === "pending") throw new HttpError(403, "pending");
      if (a.status !== "active") throw new HttpError(403, "disabled");
      return { token: session(a), role: a.role, name: a.name };
    }

    if (method === "GET" && path === "/api/walks") {
      return db.prepare("select id, team, lat, lon, ends_at from walks where ends_at > ? order by started_at desc").all(now()).map((w) => ({ ...(w as object), ends_at: iso((w as { ends_at: number }).ends_at) }));
    }

    // ------------------------------------------------------------ signed in
    if (method === "GET" && path === "/api/partner/me") {
      const a = account(req);
      return { name: a.name, role: a.role, email: a.email };
    }

    if (method === "POST" && path === "/api/partner/logout") {
      const m = String(req.headers.authorization ?? "").match(/^Bearer (\S+)$/);
      if (m) db.prepare("delete from partner_sessions where token_hash = ?").run(sha(m[1]));
      return { ok: true };
    }

    if (method === "GET" && path === "/api/partner/map") {
      const a = account(req);
      const days = Math.max(1, Math.min(90, Number(new URL(req.url ?? "", "http://x").searchParams.get("days") ?? 30)));
      const since = now() - days * DAY;
      const reports = (
        db
          .prepare(
            `select r.id, r.type, r.category, r.severity, r.lat, r.lon, r.created_at, r.expires_at,
              (select count(*) from confirmations c where c.report_id = r.id) as confirmations, r.hate
             from reports r where r.status = 'approved' and r.private = 0 and r.created_at > ? order by r.created_at desc limit 5000`,
          )
          .all(since) as Record<string, number | string>[]
      ).map((r) => ({ ...r, created_at: iso(r.created_at as number), expires_at: iso(r.expires_at as number), hate: a.role === "buurtteam" ? undefined : !!r.hate }));
      const hours = Array.from({ length: 24 }, () => 0);
      const hourOf = new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: d.timeZone });
      for (const r of reports) hours[Number(hourOf.format(new Date(r.created_at as string))) % 24]++;
      return {
        days,
        reports,
        hours,
        signals: a.role === "buurtteam" ? [] : privateSignals(),
        walks: db.prepare("select id, team, lat, lon, ends_at from walks where ends_at > ?").all(now()),
      };
    }

    if (path === "/api/partner/walks" && method === "POST") {
      const a = account(req, ["buurtteam", "moderator"]);
      const b = await d.body(req);
      const lat = Number(b.lat);
      const lon = Number(b.lon);
      const hours = Math.max(1, Math.min(4, Number(b.hours ?? 2)));
      if (!inNetherlands({ lat, lon })) throw new HttpError(422, "outside_area");
      const p = fuzz({ lat, lon });
      db.prepare("delete from walks where account_id = ?").run(a.id);
      const id = randomUUID();
      db.prepare("insert into walks (id, account_id, team, lat, lon, started_at, ends_at) values (?,?,?,?,?,?,?)").run(id, a.id, a.name, p.lat, p.lon, now(), now() + hours * 3_600_000);
      d.emit();
      return { id, ends_at: iso(now() + hours * 3_600_000) };
    }

    if (method === "DELETE" && seg[2] === "walks" && seg.length === 4) {
      const a = account(req, ["buurtteam", "moderator"]);
      db.prepare("delete from walks where id = ? and (account_id = ? or ? = 'moderator')").run(seg[3], a.id, a.role);
      d.emit();
      return { ok: true };
    }

    // ------------------------------------------------------------ moderators
    if (method === "GET" && path === "/api/partner/queue") {
      account(req, ["moderator"]);
      return (
        db
          .prepare(
            `select r.id, r.type, r.category, r.severity, r.lat, r.lon, r.created_at, r.note, r.status, r.moderation, r.private, r.hate,
              (select count(*) from flags f where f.report_id = r.id) as flags,
              (select group_concat(reason) from flags f where f.report_id = r.id) as flag_reasons
             from reports r where r.status = 'pending' order by r.created_at desc limit 200`,
          )
          .all() as Record<string, unknown>[]
      ).map((r) => ({ ...r, created_at: iso(r.created_at as number), label: getCategory(String(r.category))?.label ?? r.category, moderation: r.moderation ? JSON.parse(String(r.moderation)) : null }));
    }

    if (method === "POST" && seg[2] === "reports" && seg.length === 4) {
      account(req, ["moderator"]);
      const status = String((await d.body(req)).status ?? "") as Status;
      if (!["approved", "removed"].includes(status)) throw new HttpError(422, "invalid");
      d.setReportStatus(seg[3], status);
      return { ok: true };
    }

    if (method === "GET" && path === "/api/partner/accounts") {
      account(req, ["moderator"]);
      return db.prepare("select id, email, name, role, status, created_at from accounts order by status = 'pending' desc, created_at desc limit 500").all();
    }

    if (method === "POST" && seg[2] === "accounts" && seg.length === 4) {
      const me = account(req, ["moderator"]);
      const status = String((await d.body(req)).status ?? "");
      if (!["active", "disabled"].includes(status) || seg[3] === me.id) throw new HttpError(422, "invalid");
      db.prepare("update accounts set status = ? where id = ?").run(status, seg[3]);
      if (status === "disabled") db.prepare("delete from partner_sessions where account_id = ?").run(seg[3]);
      return { ok: true };
    }

    if (method === "POST" && path === "/api/partner/invites") {
      const me = account(req, ["moderator"]);
      const role = String((await d.body(req)).role ?? "");
      if (!["buurtteam", "moderator"].includes(role)) throw new HttpError(422, "invalid");
      const code = randomBytes(5).toString("hex").toUpperCase();
      db.prepare("insert into invites (code, role, created_by, expires_at) values (?,?,?,?)").run(code, role, me.id, now() + 14 * DAY);
      return { code, role, expires_at: iso(now() + 14 * DAY) };
    }

    return undefined;
  };
}
