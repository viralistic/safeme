// From design/tokens.css: dark topographic HUD, poppy red for danger, Geist light.
export const C = {
  page: "#070b12",
  bg: "#0a0e16",
  fg: "#eaf1f8",
  muted: "#8c9cb1",
  soft: "#cfd3dd",
  border: "rgba(120,160,210,0.14)",
  surface: "rgba(140,180,230,0.05)",
  surface2: "rgba(140,180,230,0.10)",
  red: "#ed3a2c",
  redDeep: "#b92a21",
  oxblood: "#9a2230",
  powder: "#bcd4e6",
  cyan: "#38d2ff",
  blue: "#1f9cff",
  mapGrey: "#2b2e35",
};

export const F = {
  light: "Geist-Light",
  regular: "Geist-Regular",
  medium: "Geist-Medium",
  semibold: "Geist-SemiBold",
};

export const R = { md: 16, sm: 12, pill: 999 };

export const LEVEL_COLOR = { low: C.powder, mid: C.oxblood, high: C.red } as const;
