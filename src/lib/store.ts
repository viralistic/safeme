import { createDemoStore } from "./demoStore";
import { createApiStore } from "./apiStore";
import type { LatLon } from "./fuzz";
import type { ReportStore } from "./types";

/** The API lives at /api by default (the Node server serves the site and the API). */
export const API_URL = import.meta.env.PUBLIC_API_URL || "/api";

/** Only the single-file demo and local experiments run without a server. */
export const DEMO = import.meta.env.PUBLIC_DEMO === "true";

export function createStore(getCenter: () => LatLon): ReportStore {
  return DEMO ? createDemoStore(getCenter) : createApiStore(API_URL);
}
