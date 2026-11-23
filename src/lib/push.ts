// Web Push. The browser subscribes, our API stores the subscription with a
// fuzzed area and sends pushes itself (VAPID keys live on the server only).

import { createApi } from "./apiStore";
import { API_URL } from "./store";
import { fuzz } from "./fuzz";
import type { AlertPrefs } from "./prefs";

export type PushState = "unsupported" | "denied" | "ok" | "no-backend";

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function enablePush(prefs: AlertPrefs): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  if (!API_URL || !prefs.area) return "no-backend";

  try {
    const api = createApi(API_URL);
    const { vapidPublicKey } = await (await fetch(api.url("/config"))).json();
    if (!vapidPublicKey) return "no-backend";
    const reg = await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) }));
    const json = sub.toJSON();
    const area = fuzz(prefs.area, 500);
    await api.call("PUT", "/push", {
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      lat: area.lat,
      lon: area.lon,
      radius_m: prefs.radiusM,
      only_high: prefs.onlyHigh,
    });
    return "ok";
  } catch {
    return "no-backend";
  }
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  if (API_URL) await createApi(API_URL).call("DELETE", "/push", { endpoint: sub.endpoint }).catch(() => {});
  await sub.unsubscribe();
}
