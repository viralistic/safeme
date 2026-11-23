import { createDemoStore } from "./demoStore";
import { createApiStore } from "./apiStore";
import type { LatLon } from "./fuzz";
import type { ReportStore } from "./types";

/** PUBLIC_API_URL set (for example "/api"): live. Empty: demo mode on this device. */
export const API_URL = import.meta.env.PUBLIC_API_URL || "";

export function createStore(getCenter: () => LatLon): ReportStore {
  return API_URL ? createApiStore(API_URL) : createDemoStore(getCenter);
}
