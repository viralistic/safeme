// Dutch is the source language. English for visitors and expats: phones that are
// not set to Dutch get English automatically, and Jij lets anyone switch.

import { EN } from "./i18n.en";

export type Lang = "nl" | "en";
const KEY = "sm.lang";

function detect(): Lang {
  if (typeof window === "undefined") return "nl";
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "nl" || saved === "en") return saved;
  } catch {}
  return (navigator.language || "nl").toLowerCase().startsWith("nl") ? "nl" : "en";
}

export const lang: Lang = detect();

/** Translate a Dutch string. `{name}` placeholders are filled from `vars`. */
export function t(nl: string, vars?: Record<string, string | number>): string {
  let s = lang === "en" ? EN[nl] ?? nl : nl;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export function setLang(l: Lang): void {
  try {
    localStorage.setItem(KEY, l);
  } catch {}
  location.reload();
}

export const locale = lang === "en" ? "en-GB" : "nl-NL";
