// Safety Map API. Plain Node, SQLite on local disk, no third-party services.
// Privacy rules enforced here: fuzzing, no public notes, expiry, pseudonymous
// reporters, rate limits. Run it on an EU host and all data stays there.

import { DatabaseSync } from "node:sqlite";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { extname, join, normalize } from "node:path";
import * as webpush from "web-push";
import { getCategory } from "../src/lib/categories.ts";
import { distanceM, fuzz, inNetherlands } from "../src/lib/fuzz.ts";
import { moderateNote, type AiConfig } from "./moderation.ts";
import { HttpError } from "./http.ts";
import { createPartnerRoutes, ensureModerator, migratePartners } from "./partners.ts";

export interface Config {
  dbPath: string;
  /** Built site to serve (Astro `dist`). Optional. */
  staticDir?: string;
  /** Self-hosted map tiles, fonts and sprites, served at /tiles/ with range requests. */
  tilesDir?: string;
  /** Bearer token for moderation endpoints (n8n). Admin API is off without it. */
  adminToken?: string;
  /** Optional n8n webhook that receives every new report for moderation. */
  webhookUrl?: string;
  webhookSecret?: string;
  /** Optional AI first pass on notes (OpenAI-compatible endpoint, self-hosted or EU). */
  ai?: AiConfig;
  /** Optional Telegram alerts for moderators. */
  telegram?: { token: string; chatId: string };
  vapid?: { publicKey: string; privateKey: string; subject: string };
  /** Trust X-Forwarded-For (only behind your own reverse proxy). */
  trustProxy?: boolean;
  /** First moderator account, created once at start. */
  moderator?: { email: string; password: string };
  /** Email domain for police sign-ups. */
  policeDomain?: string;
  /** City time zone, default Europe/Amsterdam. */
  timeZone?: string;
  now?: () => number;
}

const HOUR = 3_600_000;
const FLAG_REASONS = new Set(["onjuist", "persoon", "spam"]);
const RADII = new Set([500, 1000, 2000]);

type Status = "pending" | "approved" | "removed";

interface ReportRow {
  id: string;
  type: string;
  category: string;
  severity: number;
  lat: number;
  lon: number;
  created_at: number;
  expires_at: number;
  note: string | null;
  reporter_id: string;
  status: Status;
  confidence: number;
  moderation?: string | null;
}



function addColumn(db: DatabaseSync, table: string, column: string, type: string) {
  const cols = db.prepare(`pragma table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) db.exec(`alter table ${table} add column ${column} ${type}`);
}

export function migrate(db: DatabaseSync) {
  db.exec(`
    pragma journal_mode = wal;
    pragma foreign_keys = on;
    create table if not exists reporters (
      id text primary key,
      token_hash text not null unique,
      created_at integer not null
    );
    create table if not exists reports (
      id text primary key,
      type text not null check (type in ('situation','incident')),
      category text not null,
      severity integer not null check (severity between 0 and 100),
      lat real not null,
      lon real not null,
      created_at integer not null,
      expires_at integer not null,
      note text,
      reporter_id text not null references reporters(id) on delete cascade,
      status text not null check (status in ('pending','approved','removed')),
      confidence real not null default 0.5
    );
    create index if not exists reports_live on reports (status, expires_at);
    create index if not exists reports_reporter on reports (reporter_id, created_at);
    create table if not exists confirmations (
      report_id text not null references reports(id) on delete cascade,
      reporter_id text not null,
      primary key (report_id, reporter_id)
    );
    create table if not exists flags (
      report_id text not null references reports(id) on delete cascade,
      reporter_id text not null,
      reason text not null,
      created_at integer not null,
      primary key (report_id, reporter_id)
    );
    create table if not exists push_subscriptions (
      endpoint text primary key,
      reporter_id text not null references reporters(id) on delete cascade,
      p256dh text not null,
      auth text not null,
      lat real not null,
      lon real not null,
      radius_m integer not null,
      only_high integer not null default 0,
      created_at integer not null
    );
  `);
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/** Fixed-window counter in memory, keyed by a salted hash. Nothing is persisted. */
function limiter(max: number, windowMs: number, now: () => number) {
  const hits = new Map<string, { n: number; reset: number }>();
  return (key: string) => {
    const t = now();
    const h = hits.get(key);
    if (!h || h.reset < t) {
      hits.set(key, { n: 1, reset: t + windowMs });
      if (hits.size > 50_000) for (const [k, v] of hits) if (v.reset < t) hits.delete(k);
      return true;
    }
    h.n++;
    return h.n <= max;
  };
}

export function createApp(cfg: Config) {
  const now = cfg.now ?? Date.now;
  const db = new DatabaseSync(cfg.dbPath);
  migrate(db);
  addColumn(db, "reports", "moderation", "text");
  addColumn(db, "reports", "private", "integer not null default 0");
  addColumn(db, "reports", "hate", "integer not null default 0");
  migratePartners(db);
  if (cfg.moderator) ensureModerator(db, cfg.moderator.email, cfg.moderator.password, now());

  if (cfg.vapid) webpush.setVapidDetails(cfg.vapid.subject, cfg.vapid.publicKey, cfg.vapid.privateKey);

  // IPs are only used as salted hashes for rate limiting. The salt rotates on restart.
  const ipSalt = randomBytes(16).toString("hex");
  // Generous: many people can share one IP on public Wi-Fi. Tokens are kept on the device.
  const sessionLimit = limiter(60, HOUR, now);
  const ipReportLimit = limiter(20, HOUR, now);
  const writeLimit = limiter(120, HOUR, now);

  const streams = new Set<ServerResponse>();
  const emit = () => {
    for (const s of streams) s.write("event: change\ndata: {}\n\n");
  };

  // ---------------------------------------------------------------- helpers

  function ipKey(req: IncomingMessage): string {
    const fwd = cfg.trustProxy ? String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim() : "";
    return sha(ipSalt + (fwd || req.socket.remoteAddress || "?"));
  }

  function reporter(req: IncomingMessage): string {
    const m = String(req.headers.authorization ?? "").match(/^Bearer (\S+)$/);
    if (!m) throw new HttpError(401, "auth_required");
    const row = db.prepare("select id from reporters where token_hash = ?").get(sha(m[1])) as { id: string } | undefined;
    if (!row) throw new HttpError(401, "auth_required");
    return row.id;
  }

  function admin(req: IncomingMessage) {
    const m = String(req.headers.authorization ?? "").match(/^Bearer (\S+)$/);
    const a = Buffer.from(m?.[1] ?? "");
    const b = Buffer.from(cfg.adminToken ?? "");
    if (!cfg.adminToken || a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(401, "auth_required");
  }

  async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
    let size = 0;
    const chunks: Buffer[] = [];
    for await (const c of req) {
      size += (c as Buffer).length;
      if (size > 8192) throw new HttpError(413, "too_large");
      chunks.push(c as Buffer);
    }
    if (!chunks.length) return {};
    try {
      const v = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      return v && typeof v === "object" ? v : {};
    } catch {
      throw new HttpError(400, "invalid_json");
    }
  }

  const PIN_SQL = `
    select r.id, r.type, r.category, r.severity, r.lat, r.lon, r.created_at, r.expires_at,
      (select count(*) from confirmations c where c.report_id = r.id) as confirmations
    from reports r`;

  function toPin(r: Record<string, unknown>) {
    return {
      id: r.id,
      type: r.type,
      category: r.category,
      severity: r.severity,
      lat: r.lat,
      lon: r.lon,
      created_at: new Date(r.created_at as number).toISOString(),
      expires_at: new Date(r.expires_at as number).toISOString(),
      confirmations: Number(r.confirmations ?? 0),
    };
  }

  function livePins() {
    return (db.prepare(`${PIN_SQL} where r.status = 'approved' and r.private = 0 and r.expires_at > ? order by r.created_at desc limit 2000`).all(now()) as Record<string, unknown>[]).map(toPin);
  }

  function pin(id: string) {
    const r = db.prepare(`${PIN_SQL} where r.id = ? and r.status = 'approved' and r.private = 0 and r.expires_at > ?`).get(id, now()) as Record<string, unknown> | undefined;
    return r ? toPin(r) : null;
  }

  /** Short alert to the moderators' Telegram chat. Never includes the note or the reporter. */
  async function alertModerators(text: string) {
    if (!cfg.telegram) return;
    try {
      await fetch(`https://api.telegram.org/bot${cfg.telegram.token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: cfg.telegram.chatId, text, disable_web_page_preview: true }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {}
  }

  async function notifyWebhook(report: ReportRow) {
    if (!cfg.webhookUrl) return;
    try {
      await fetch(cfg.webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json", ...(cfg.webhookSecret ? { authorization: `Bearer ${cfg.webhookSecret}` } : {}) },
        body: JSON.stringify({
          event: "report.created",
          forward: getCategory(report.category)?.forward ?? null,
          report: { ...report, reporter_id: undefined, created_at: new Date(report.created_at).toISOString(), expires_at: new Date(report.expires_at).toISOString() },
        }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {}
  }

  function subscribersFor(report: ReportRow) {
    const welfare = !!getCategory(report.category)?.welfare;
    const subs = db.prepare("select * from push_subscriptions where reporter_id <> ?").all(report.reporter_id) as {
      endpoint: string;
      p256dh: string;
      auth: string;
      lat: number;
      lon: number;
      radius_m: number;
      only_high: number;
    }[];
    return subs.filter((s) => distanceM(s, report) <= s.radius_m && (!s.only_high || (report.severity >= 67 && !welfare)));
  }

  async function sendPushes(report: ReportRow) {
    if (!cfg.vapid || report.status !== "approved") return;
    const cat = getCategory(report.category);
    const payload = JSON.stringify({ id: report.id, title: `${cat?.label ?? "Melding"} in je buurt`, body: "Bekijk de kaart. Bij nood: bel 112." });
    await Promise.all(
      subscribersFor(report).map((s) =>
        webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600 }).catch((e: { statusCode?: number }) => {
          if (e.statusCode === 404 || e.statusCode === 410) db.prepare("delete from push_subscriptions where endpoint = ?").run(s.endpoint);
        }),
      ),
    );
  }

  /** Expired notes are wiped, raw reports go after 30 days. */
  function purge() {
    const t = now();
    db.prepare("update reports set note = null where expires_at <= ? and note is not null").run(t);
    db.prepare("delete from reports where created_at < ?").run(t - 30 * 24 * HOUR);
  }

  function setReportStatus(id: string, status: Status, confidence?: number) {
    const before = db.prepare("select * from reports where id = ?").get(id) as (ReportRow & { private: number }) | undefined;
    if (!before) throw new HttpError(404, "not_found");
    const conf = confidence === undefined || !Number.isFinite(confidence) ? before.confidence : Math.max(0, Math.min(1, confidence));
    db.prepare("update reports set status = ?, confidence = ? where id = ?").run(status, conf, id);
    emit();
    if (status === "approved" && before.status === "pending" && !before.private) void sendPushes({ ...before, status });
  }

  const partner = createPartnerRoutes({
    db,
    now,
    body,
    emit,
    setReportStatus,
    alert: (t) => void alertModerators(t),
    policeDomain: cfg.policeDomain ?? "politie.nl",
    timeZone: cfg.timeZone ?? "Europe/Amsterdam",
  });

  // ---------------------------------------------------------------- routes

  async function api(req: IncomingMessage, res: ServerResponse, path: string): Promise<unknown> {
    const method = req.method ?? "GET";
    const seg = path.split("/").filter(Boolean); // ["api", ...]

    if (method === "POST" && path === "/api/session") {
      if (!sessionLimit(ipKey(req))) throw new HttpError(429, "rate_limited");
      const token = randomBytes(32).toString("base64url");
      db.prepare("insert into reporters (id, token_hash, created_at) values (?, ?, ?)").run(randomUUID(), sha(token), now());
      return { token };
    }

    if (method === "GET" && path === "/api/pins") return livePins();

    if (method === "GET" && path === "/api/events") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
      res.write("retry: 5000\n\n");
      streams.add(res);
      const beat = setInterval(() => res.write(": ping\n\n"), 25_000);
      req.on("close", () => {
        clearInterval(beat);
        streams.delete(res);
      });
      return undefined;
    }

    if (method === "POST" && path === "/api/reports") {
      const uid = reporter(req);
      const b = await body(req);
      const cat = getCategory(String(b.category ?? ""));
      if (!cat || cat.type !== b.type) throw new HttpError(422, "invalid");
      const severity = Number(b.severity);
      if (!Number.isInteger(severity) || severity < 0 || severity > 100) throw new HttpError(422, "invalid");
      const lat = Number(b.lat);
      const lon = Number(b.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || !inNetherlands({ lat, lon })) throw new HttpError(422, "outside_area");
      const point = fuzz({ lat, lon });
      const t = now();

      const recent = db.prepare("select lat, lon, created_at from reports where reporter_id = ? and created_at > ?").all(uid, t - HOUR) as {
        lat: number;
        lon: number;
        created_at: number;
      }[];
      const sameCell = recent.some((r) => r.created_at > t - HOUR / 2 && distanceM(r, point) < 1);
      if (recent.length >= 5 || sameCell || !ipReportLimit(ipKey(req))) throw new HttpError(429, "rate_limited");

      const removed = (db.prepare("select count(*) n from reports where reporter_id = ? and status = 'removed' and created_at > ?").get(uid, t - 30 * 24 * HOUR) as { n: number }).n;
      let note = typeof b.note === "string" && b.note.trim() ? b.note.trim().slice(0, 280) : null;
      const check = note ? await moderateNote(note, cfg.ai) : null;
      // A note that describes who someone is gets dropped; the report itself still counts.
      if (check?.verdict === "strip_note") note = null;
      const needsReview = removed > 0 || check?.verdict === "review";
      const row: ReportRow = {
        id: randomUUID(),
        type: cat.type,
        category: cat.id,
        severity,
        ...point,
        created_at: t,
        expires_at: t + cat.ttlMinutes * 60_000,
        note,
        reporter_id: uid,
        status: needsReview ? "pending" : "approved",
        confidence: needsReview ? 0.2 : 0.5,
        moderation: check && check.verdict !== "ok" ? JSON.stringify(check) : null,
      };
      db.prepare(
        "insert into reports (id, type, category, severity, lat, lon, created_at, expires_at, note, reporter_id, status, confidence, moderation, private, hate) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      ).run(row.id, row.type, row.category, row.severity, row.lat, row.lon, row.created_at, row.expires_at, row.note, row.reporter_id, row.status, row.confidence, row.moderation ?? null, cat.private ? 1 : 0, cat.type === "incident" && b.hate === true ? 1 : 0);

      void notifyWebhook(row);
      if (row.status === "pending") void alertModerators(`Nieuwe melding wacht op controle: ${cat.label}${check?.reasons.length ? ` (${check.reasons.join(", ")})` : ""}`);
      // Private signals never reach the public map or pushes; police see them once a second person reports.
      if (cat.private && row.status === "approved") return { status: "private" };
      if (row.status === "approved") {
        emit();
        void sendPushes(row);
        return { status: "approved", report: pin(row.id) };
      }
      return { status: "pending" };
    }

    if (method === "POST" && seg[1] === "reports" && seg[3] === "confirm" && seg.length === 4) {
      const uid = reporter(req);
      if (!writeLimit(uid)) throw new HttpError(429, "rate_limited");
      const r = db.prepare("select reporter_id from reports where id = ? and status = 'approved' and expires_at > ?").get(seg[2], now()) as { reporter_id: string } | undefined;
      if (!r || r.reporter_id === uid) return { ok: false };
      const ins = db.prepare("insert or ignore into confirmations (report_id, reporter_id) values (?, ?)").run(seg[2], uid);
      if (!ins.changes) return { ok: false };
      const n = (db.prepare("select count(*) n from confirmations where report_id = ?").get(seg[2]) as { n: number }).n;
      db.prepare("update reports set confidence = min(1, 0.5 + 0.1 * ?) where id = ?").run(n, seg[2]);
      emit();
      return { ok: true };
    }

    if (method === "POST" && seg[1] === "reports" && seg[3] === "flag" && seg.length === 4) {
      const uid = reporter(req);
      if (!writeLimit(uid)) throw new HttpError(429, "rate_limited");
      const reason = String((await body(req)).reason ?? "");
      if (!FLAG_REASONS.has(reason)) throw new HttpError(422, "invalid");
      if (!db.prepare("select 1 from reports where id = ?").get(seg[2])) throw new HttpError(404, "not_found");
      db.prepare("insert or ignore into flags (report_id, reporter_id, reason, created_at) values (?, ?, ?, ?)").run(seg[2], uid, reason, now());
      const n = (db.prepare("select count(*) n from flags where report_id = ?").get(seg[2]) as { n: number }).n;
      // Three flags hide the pin until moderation decides.
      if (n >= 3 && db.prepare("update reports set status = 'pending' where id = ? and status = 'approved'").run(seg[2]).changes) {
        emit();
        void alertModerators("Een melding is drie keer gerapporteerd en staat nu op controle.");
      }
      return { ok: true };
    }

    if (path === "/api/push" && (method === "PUT" || method === "DELETE")) {
      const uid = reporter(req);
      const b = await body(req);
      const endpoint = String(b.endpoint ?? "");
      if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000) throw new HttpError(422, "invalid");
      if (method === "DELETE") {
        db.prepare("delete from push_subscriptions where endpoint = ? and reporter_id = ?").run(endpoint, uid);
        return { ok: true };
      }
      const lat = Number(b.lat);
      const lon = Number(b.lon);
      const radius = Number(b.radius_m);
      if (!inNetherlands({ lat, lon }) || !RADII.has(radius) || typeof b.p256dh !== "string" || typeof b.auth !== "string") throw new HttpError(422, "invalid");
      const area = fuzz({ lat, lon }, 500);
      db.prepare(
        `insert into push_subscriptions (endpoint, reporter_id, p256dh, auth, lat, lon, radius_m, only_high, created_at)
         values (?,?,?,?,?,?,?,?,?)
         on conflict(endpoint) do update set reporter_id = excluded.reporter_id, p256dh = excluded.p256dh, auth = excluded.auth,
           lat = excluded.lat, lon = excluded.lon, radius_m = excluded.radius_m, only_high = excluded.only_high`,
      ).run(endpoint, uid, b.p256dh, b.auth, area.lat, area.lon, radius, b.only_high ? 1 : 0, now());
      return { ok: true };
    }

    if (method === "GET" && path === "/api/config") return { vapidPublicKey: cfg.vapid?.publicKey ?? null };

    // Moderation API for n8n.
    if (seg[1] === "admin") {
      admin(req);
      if (method === "GET" && path === "/api/admin/reports") {
        const url = new URL(req.url ?? "", "http://x");
        const status = url.searchParams.get("status") ?? "pending";
        return (db.prepare("select r.*, (select count(*) from flags f where f.report_id = r.id) as flags from reports r where status = ? order by created_at desc limit 500").all(status) as Record<string, unknown>[]).map(
          ({ reporter_id: _r, ...r }) => ({ ...r, created_at: new Date(r.created_at as number).toISOString(), expires_at: new Date(r.expires_at as number).toISOString() }),
        );
      }
      if (method === "POST" && seg[2] === "reports" && seg.length === 4) {
        const b = await body(req);
        const status = String(b.status ?? "") as Status;
        if (!["pending", "approved", "removed"].includes(status)) throw new HttpError(422, "invalid");
        const before = db.prepare("select * from reports where id = ?").get(seg[3]) as ReportRow | undefined;
        if (!before) throw new HttpError(404, "not_found");
        setReportStatus(seg[3], status, b.confidence === undefined ? undefined : Number(b.confidence));
        return { ok: true };
      }
    }

    if (path.startsWith("/api/partner/") || path === "/api/walks") {
      const out = await partner(req, path, method, seg);
      if (out !== undefined) return out;
    }

    throw new HttpError(404, "not_found");
  }

  // ---------------------------------------------------------------- static

  const TYPES: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".webmanifest": "application/manifest+json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
    ".woff": "font/woff",
    ".txt": "text/plain; charset=utf-8",
  };

  async function serveTiles(req: IncomingMessage, res: ServerResponse, path: string) {
    if (!cfg.tilesDir) throw new HttpError(404, "not_found");
    const clean = normalize(decodeURIComponent(path.slice("/tiles".length))).replace(/^(\.\.[/\\])+/, "");
    const file = join(cfg.tilesDir, clean);
    if (!file.startsWith(cfg.tilesDir)) throw new HttpError(404, "not_found");
    let size: number;
    try {
      const st = await stat(file);
      if (!st.isFile()) throw new Error();
      size = st.size;
    } catch {
      throw new HttpError(404, "not_found");
    }
    const type = file.endsWith(".pbf") ? "application/x-protobuf" : TYPES[extname(file)] ?? "application/octet-stream";
    const range = String(req.headers.range ?? "").match(/^bytes=(\d+)-(\d*)$/);
    const headers = { "content-type": type, "accept-ranges": "bytes", "cache-control": "public, max-age=86400" };
    if (range) {
      const start = Number(range[1]);
      const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      if (start > end || start >= size) {
        res.writeHead(416, { "content-range": `bytes */${size}` });
        res.end();
        return;
      }
      res.writeHead(206, { ...headers, "content-range": `bytes ${start}-${end}/${size}`, "content-length": end - start + 1 });
      createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { ...headers, "content-length": size });
    createReadStream(file).pipe(res);
  }

  async function serveStatic(res: ServerResponse, path: string) {
    if (!cfg.staticDir) throw new HttpError(404, "not_found");
    const clean = normalize(decodeURIComponent(path)).replace(/^(\.\.[/\\])+/, "");
    for (const candidate of [clean, join(clean, "index.html"), `${clean}.html`]) {
      const file = join(cfg.staticDir, candidate);
      if (!file.startsWith(cfg.staticDir)) break;
      try {
        if (!(await stat(file)).isFile()) continue;
        const data = await readFile(file);
        res.writeHead(200, {
          "content-type": TYPES[extname(file)] ?? "application/octet-stream",
          "cache-control": clean.startsWith("/_astro/") ? "public, max-age=31536000, immutable" : clean === "/sw.js" ? "no-cache" : "public, max-age=300",
        });
        res.end(data);
        return;
      } catch {}
    }
    throw new HttpError(404, "not_found");
  }

  const server = createServer(async (req, res) => {
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("referrer-policy", "no-referrer");
    res.setHeader("x-frame-options", "DENY");
    res.setHeader("permissions-policy", "geolocation=(self), camera=(), microphone=()");
    const path = new URL(req.url ?? "/", "http://x").pathname;
    try {
      if (path.startsWith("/api/")) {
        res.setHeader("cache-control", "no-store");
        const out = await api(req, res, path);
        if (out !== undefined) {
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify(out));
        }
      } else if (path.startsWith("/tiles/")) await serveTiles(req, res, path);
      else await serveStatic(res, path);
    } catch (e) {
      const err = e instanceof HttpError ? e : new HttpError(500, "unknown");
      if (!(e instanceof HttpError)) console.error(e);
      if (!res.headersSent) res.writeHead(err.status, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: err.code }));
    }
  });

  const purgeTimer = setInterval(purge, 10 * 60_000);
  purgeTimer.unref();

  return {
    server,
    db,
    purge,
    close() {
      clearInterval(purgeTimer);
      for (const s of streams) s.end();
      server.close();
      db.close();
    },
  };
}
