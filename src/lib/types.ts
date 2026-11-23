import type { ReportType } from "./categories";

/** What anyone may see. Never carries reporter, note or signalement. */
export interface PublicReport {
  id: string;
  type: ReportType;
  category: string;
  severity: number;
  lat: number;
  lon: number;
  created_at: string;
  expires_at: string;
  confirmations: number;
}

export interface NewReport {
  type: ReportType;
  category: string;
  severity: number;
  lat: number;
  lon: number;
  /** Seen by moderation only. Never public in the MVP. */
  note?: string;
}

export type SubmitResult =
  | { ok: true; status: "approved"; report: PublicReport }
  | { ok: true; status: "pending" }
  | { ok: false; error: ReportError };

export type ReportError = "rate_limited" | "outside_area" | "invalid" | "offline" | "unknown";

export type FlagReason = "onjuist" | "persoon" | "spam";

export interface ReportStore {
  mode: "demo" | "live";
  list(): Promise<PublicReport[]>;
  submit(r: NewReport): Promise<SubmitResult>;
  confirm(id: string): Promise<boolean>;
  flag(id: string, reason: FlagReason): Promise<boolean>;
  hasConfirmed(id: string): boolean;
  isOwn(id: string): boolean;
  subscribe(onChange: () => void): () => void;
  /** Forget everything this device stored. */
  reset(): Promise<void>;
}

export const ERROR_COPY: Record<ReportError, string> = {
  rate_limited: "Je hebt hier net al gemeld. Probeer het over een half uur opnieuw.",
  outside_area: "Safety Map werkt alleen in Nederland.",
  invalid: "Er ging iets mis met je melding. Kies opnieuw een categorie.",
  offline: "Geen verbinding. Probeer het zo opnieuw.",
  unknown: "Er ging iets mis. Probeer het zo opnieuw.",
};
