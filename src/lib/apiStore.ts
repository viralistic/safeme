// Live mode: our own API (server/). No third-party backend.
import type { FlagReason, NewReport, PublicReport, ReportError, ReportStore, SubmitResult } from "./types";

const TOKEN = "sm.api.token";
const CONFIRMED = "sm.api.confirmed";
const OWN = "sm.api.own";

function readList(key: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]");
  } catch {
    return [];
  }
}
function addTo(key: string, id: string) {
  try {
    localStorage.setItem(key, JSON.stringify([...readList(key), id]));
  } catch {}
}

export class ApiError extends Error {
  code: ReportError;
  constructor(code: ReportError) {
    super(code);
    this.code = code;
  }
}

function toError(code?: string): ReportError {
  if (code === "rate_limited" || code === "outside_area" || code === "invalid") return code;
  return "unknown";
}

export function createApi(base: string) {
  const url = (p: string) => `${base.replace(/\/$/, "")}${p}`;

  async function token(fresh = false): Promise<string> {
    if (!fresh) {
      const t = localStorage.getItem(TOKEN);
      if (t) return t;
    }
    const res = await fetch(url("/session"), { method: "POST" });
    if (!res.ok) throw new ApiError(res.status === 429 ? "rate_limited" : "unknown");
    const { token } = await res.json();
    localStorage.setItem(TOKEN, token);
    return token;
  }

  /** Authenticated JSON call. Gets a new pseudonymous session once on 401. */
  async function call<T>(method: string, path: string, body?: unknown, retry = true): Promise<T> {
    let res: Response;
    try {
      res = await fetch(url(path), {
        method,
        headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError("offline");
    }
    if (res.status === 401 && retry) {
      await token(true);
      return call(method, path, body, false);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(toError(data.error));
    return data as T;
  }

  return { url, call, token };
}

export function createApiStore(base: string): ReportStore {
  const api = createApi(base);

  return {
    mode: "live",

    async list() {
      const res = await fetch(api.url("/pins"));
      if (!res.ok) throw new ApiError("unknown");
      return (await res.json()) as PublicReport[];
    },

    async submit(r: NewReport): Promise<SubmitResult> {
      try {
        const out = await api.call<{ status: "approved" | "pending"; report?: PublicReport }>("POST", "/reports", r);
        if (out.status === "approved" && out.report) {
          addTo(OWN, out.report.id);
          return { ok: true, status: "approved", report: out.report };
        }
        return { ok: true, status: "pending" };
      } catch (e) {
        return { ok: false, error: e instanceof ApiError ? e.code : "unknown" };
      }
    },

    async confirm(id) {
      try {
        const { ok } = await api.call<{ ok: boolean }>("POST", `/reports/${encodeURIComponent(id)}/confirm`);
        if (ok) addTo(CONFIRMED, id);
        return ok;
      } catch {
        return false;
      }
    },

    async flag(id, reason: FlagReason) {
      try {
        await api.call("POST", `/reports/${encodeURIComponent(id)}/flag`, { reason });
        return true;
      } catch {
        return false;
      }
    },

    hasConfirmed: (id) => readList(CONFIRMED).includes(id),
    isOwn: (id) => readList(OWN).includes(id),

    subscribe(fn) {
      if (typeof EventSource === "undefined") return () => {};
      const es = new EventSource(api.url("/events"));
      es.addEventListener("change", () => fn());
      return () => es.close();
    },

    async reset() {
      [TOKEN, CONFIRMED, OWN].forEach((k) => localStorage.removeItem(k));
    },
  };
}
