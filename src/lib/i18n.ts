// Dutch is the source language. English for visitors and expats: phones that are
// not set to Dutch get English automatically, and Jij lets anyone switch.

import { EN } from "./i18n.en.ts";

export type Lang = "nl" | "en";
const KEY = "sm.lang";

// The native app sets these before anything else loads (mobile/src/boot.ts).
const host = globalThis as { __SM_LANG__?: Lang; __SM_SET_LANG__?: (l: Lang) => void };

function detect(): Lang {
  if (host.__SM_LANG__ === "nl" || host.__SM_LANG__ === "en") return host.__SM_LANG__;
  if (typeof window === "undefined" || typeof localStorage === "undefined") return "nl";
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "nl" || saved === "en") return saved;
  } catch {}
  return (navigator.language || "nl").toLowerCase().startsWith("nl") ? "nl" : "en";
}

export const lang: Lang = detect();
if (typeof document !== "undefined" && document.documentElement) document.documentElement.lang = lang;

/** Translate a Dutch string. `{name}` placeholders are filled from `vars`. */
export function t(nl: string, vars?: Record<string, string | number>): string {
  let s = lang === "en" ? EN[nl] ?? nl : nl;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export function setLang(l: Lang): void {
  if (host.__SM_SET_LANG__) return host.__SM_SET_LANG__(l);
  try {
    localStorage.setItem(KEY, l);
  } catch {}
  location.reload();
}

export const locale = lang === "en" ? "en-GB" : "nl-NL";
