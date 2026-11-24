import { API_URL } from "@/lib/store";
import type { PublicReport } from "@/lib/types";

const KEY = "sm.partner.token";
export type Role = "police" | "buurtteam" | "moderator";

export function getToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
export function setToken(t: string | null) {
  try {
    if (t) localStorage.setItem(KEY, t);
    else localStorage.removeItem(KEY);
  } catch {}
}

export class PartnerError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

export async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL.replace(/\/$/, "")}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => {
    throw new PartnerError("offline");
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new PartnerError(data.error ?? "unknown");
  return data as T;
}

export interface PartnerReport extends PublicReport {
  hate?: boolean;
}
export interface Signal {
  category: string;
  lat: number;
  lon: number;
  reporters: number;
  reports: number;
  first: string;
  last: string;
}
export interface Walk {
  id: string;
  team: string;
  lat: number;
  lon: number;
  ends_at: number | string;
}
export interface PartnerMap {
  days: number;
  reports: PartnerReport[];
  hours: number[];
  signals: Signal[];
  walks: Walk[];
}
export interface QueueItem {
  id: string;
  label: string;
  severity: number;
  created_at: string;
  note: string | null;
  flags: number;
  flag_reasons: string | null;
  moderation: { verdict: string; reasons: string[] } | null;
  private: number;
  hate: number;
}
export interface Account {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: "pending" | "active" | "disabled";
}

export const ERRORS: Record<string, string> = {
  login: "E-mailadres of wachtwoord klopt niet.",
  pending: "Je aanvraag wacht nog op goedkeuring door een moderator.",
  disabled: "Dit account is uitgezet.",
  police_domain: "Een politie-account vraag je aan met je politie.nl-adres.",
  invite: "Deze uitnodigingscode klopt niet of is al gebruikt.",
  exists: "Er is al een account met dit e-mailadres.",
  invalid: "Vul alles in. Een wachtwoord heeft minstens 10 tekens.",
  offline: "Geen verbinding met de server.",
  unknown: "Er ging iets mis. Probeer het opnieuw.",
};
