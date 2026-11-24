// "Bel me op speaker" on the phone. Scenarios in the local store, recordings as
// files in the app's documents folder. Nothing is uploaded.
import { File } from "expo-file-system";
import * as Notifications from "expo-notifications";
import { DEFAULT_SCENARIOS } from "@shared/fakecall";
import { t } from "@shared/i18n";
import * as kv from "./kv";

export interface Scenario {
  id: string;
  name: string;
  phrase: string;
  text: string;
  /** file:// URI of the caller's own recording, if any. */
  audioUri?: string | null;
  createdAt: number;
}

const DEFAULTS: Scenario[] = DEFAULT_SCENARIOS.map(({ id, name, phrase, text, createdAt }) => ({ id, name, phrase, text, createdAt }));

export function listScenarios(): Scenario[] {
  const stored = kv.get<Scenario[]>("scenarios", []);
  const removed = kv.get<string[]>("scenariosRemoved", []);
  const ids = new Set(stored.map((s) => s.id));
  return [...DEFAULTS.filter((d) => !ids.has(d.id) && !removed.includes(d.id)), ...stored].sort((a, b) => a.createdAt - b.createdAt);
}

export function getScenario(id: string): Scenario | undefined {
  return listScenarios().find((s) => s.id === id);
}

export function saveScenario(s: Scenario): void {
  const stored = kv.get<Scenario[]>("scenarios", []).filter((x) => x.id !== s.id);
  kv.set("scenarios", [...stored, s]);
}

export function deleteScenario(id: string): void {
  const s = getScenario(id);
  if (s?.audioUri) {
    try {
      new File(s.audioUri).delete();
    } catch {}
  }
  kv.set(
    "scenarios",
    kv.get<Scenario[]>("scenarios", []).filter((x) => x.id !== id),
  );
  if (id.startsWith("default-")) kv.set("scenariosRemoved", [...kv.get<string[]>("scenariosRemoved", []), id]);
}

export function clearScenarios(): void {
  for (const s of kv.get<Scenario[]>("scenarios", [])) {
    if (s.audioUri) {
      try {
        new File(s.audioUri).delete();
      } catch {}
    }
  }
  kv.set("scenarios", []);
  kv.set("scenariosRemoved", []);
}

export function newId(): string {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ---------------------------------------------------------------- scheduling

type Pending = { id: string; at: number; notification?: string } | null;
let pending: Pending = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<(id: string | null, pending: Pending) => void>();

export function onCallEvent(fn: (ringId: string | null, pending: Pending) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(ringId: string | null) {
  listeners.forEach((l) => l(ringId, pending));
}

/** Ring now, or after a delay. A local notification rings too if the app is in the background by then. */
export async function scheduleCall(s: Scenario, delaySec: number): Promise<void> {
  await cancelCall();
  if (delaySec <= 0) return emit(s.id);
  let notification: string | undefined;
  try {
    const perm = await Notifications.requestPermissionsAsync();
    if (perm.granted)
      notification = await Notifications.scheduleNotificationAsync({
        content: { title: s.name, body: t("mobiel"), sound: "ring.wav", data: { fakecall: s.id }, interruptionLevel: "timeSensitive" },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delaySec },
      });
  } catch {}
  pending = { id: s.id, at: Date.now() + delaySec * 1000, notification };
  emit(null);
  timer = setTimeout(() => {
    const p = pending;
    pending = null;
    if (p?.notification) void Notifications.cancelScheduledNotificationAsync(p.notification).catch(() => {});
    emit(s.id);
  }, delaySec * 1000);
}

export async function cancelCall(): Promise<void> {
  clearTimeout(timer);
  if (pending?.notification) await Notifications.cancelScheduledNotificationAsync(pending.notification).catch(() => {});
  pending = null;
  emit(null);
}

export function pendingCall(): Pending {
  return pending;
}
