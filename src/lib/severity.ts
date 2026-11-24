import { t } from "./i18n";

// Severity is a continuous 0 to 100 spectrum. Buckets are only for labels and pins.

export type Level = "low" | "mid" | "high";

export function level(severity: number): Level {
  if (severity < 34) return "low";
  if (severity < 67) return "mid";
  return "high";
}

const DANGER_LABEL: Record<Level, string> = {
  low: t("Onprettig"),
  mid: t("Verdacht"),
  high: t("Direct gevaar"),
};

const WELFARE_LABEL: Record<Level, string> = {
  low: t("Kan even wachten"),
  mid: t("Hulp nodig"),
  high: t("Direct hulp nodig"),
};

export function severityLabel(severity: number, welfare = false): string {
  return (welfare ? WELFARE_LABEL : DANGER_LABEL)[level(severity)];
}

export const LEVEL_COLOR: Record<Level, string> = {
  low: "var(--powder)",
  mid: "var(--oxblood)",
  high: "var(--red)",
};

export function clampSeverity(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}
