import { t } from "./i18n";

export function minutesSince(iso: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
}

/** Short Dutch relative duration: "net", "12 min", "3 uur", "2 dagen". */
export function shortDuration(minutes: number): string {
  if (minutes < 1) return t("net");
  if (minutes < 60) return `${minutes} min`;
  const h = Math.round(minutes / 60);
  if (h < 24) return t(h === 1 ? "1 uur" : "{n} uur", { n: h });
  const d = Math.round(h / 24);
  return d === 1 ? t("1 dag") : t("{n} dagen", { n: d });
}

export function ago(iso: string, now = Date.now()): string {
  const m = minutesSince(iso, now);
  return m < 1 ? t("zojuist") : t("{d} geleden", { d: shortDuration(m) });
}

export function remaining(iso: string, now = Date.now()): string {
  const m = Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 60_000));
  return shortDuration(m);
}
