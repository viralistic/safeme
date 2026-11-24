// The phone talks to the same API as the web app. Without a server address it
// runs the shared demo store, in memory.
import * as SecureStore from "expo-secure-store";
import { createDemoStore } from "@shared/demoStore";
import { ERROR_COPY, type FlagReason, type NewReport, type PublicReport, type ReportError, type ReportStore, type SubmitResult } from "@shared/types";
import type { LatLon } from "@shared/fuzz";
import { API_URL } from "@/city";
import * as kv from "./kv";

const TOKEN = "sm.api.token";

class ApiError extends Error {
  code: ReportError;
  constructor(code: ReportError) {
    super(code);
    this.code = code;
  }
}

const toError = (c?: string): ReportError => (c === "rate_limited" || c === "outside_area" || c === "invalid" ? c : "unknown");

async function token(fresh = false): Promise<string> {
  if (!fresh) {
    const t = SecureStore.getItem(TOKEN);
    if (t) return t;
  }
  const res = await fetch(`${API_URL}/session`, { method: "POST" });
  if (!res.ok) throw new ApiError(res.status === 429 ? "rate_limited" : "unknown");
  const { token } = await res.json();
  SecureStore.setItem(TOKEN, token);
  return token;
}

export async function call<T>(method: string, path: string, body?: unknown, retry = true): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
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

const list = (k: string) => kv.get<string[]>(k, []);
const add = (k: string, id: string) => kv.set(k, [...list(k), id]);

function createApiStore(): ReportStore {
  return {
    mode: "live",
    async list() {
      const res = await fetch(`${API_URL}/pins`);
      if (!res.ok) throw new ApiError("unknown");
      return (await res.json()) as PublicReport[];
    },
    async submit(r: NewReport): Promise<SubmitResult> {
      try {
        const out = await call<{ status: "approved" | "pending" | "private"; report?: PublicReport }>("POST", "/reports", r);
        if (out.status === "private") return { ok: true, status: "private" };
        if (out.status === "approved" && out.report) {
          add("own", out.report.id);
          return { ok: true, status: "approved", report: out.report };
        }
        return { ok: true, status: "pending" };
      } catch (e) {
        return { ok: false, error: e instanceof ApiError ? e.code : "unknown" };
      }
    },
    async confirm(id) {
      try {
        const { ok } = await call<{ ok: boolean }>("POST", `/reports/${encodeURIComponent(id)}/confirm`);
        if (ok) add("confirmed", id);
        return ok;
      } catch {
        return false;
      }
    },
    async flag(id, reason: FlagReason) {
      try {
        await call("POST", `/reports/${encodeURIComponent(id)}/flag`, { reason });
        return true;
      } catch {
        return false;
      }
    },
    hasConfirmed: (id) => list("confirmed").includes(id),
    isOwn: (id) => list("own").includes(id),
    // No server-sent events in React Native: refresh every 30 seconds instead.
    subscribe(fn) {
      const t = setInterval(fn, 30_000);
      return () => clearInterval(t);
    },
    async reset() {
      try {
        await SecureStore.deleteItemAsync(TOKEN);
      } catch {}
    },
  };
}

export function createStore(getCenter: () => LatLon): ReportStore {
  return API_URL ? createApiStore() : createDemoStore(getCenter);
}

export { ERROR_COPY };
