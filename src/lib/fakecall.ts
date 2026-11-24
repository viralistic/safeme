// "Bel me op speaker": fake incoming calls set up beforehand.
// Scenarios and recordings live only on this device (IndexedDB), never uploaded.

import { t, lang } from "./i18n";

export interface Scenario {
  id: string;
  /** Name shown on the call screen, for example "Pap". */
  name: string;
  /** What you say when you answer, a reminder for yourself, for example "Hey pap". */
  phrase: string;
  /** What the caller says. Read aloud by the phone when there is no recording. */
  text: string;
  audio?: Blob | null;
  createdAt: number;
}

export const DEFAULT_SCENARIOS: Scenario[] = [
  { id: "default-pap", name: t("Pap"), phrase: t("Hey pap"), text: t("Ik sta om de hoek met de auto, ik zie je niet. Waar ben je precies?"), createdAt: 1 },
  { id: "default-mam", name: t("Mam"), phrase: t("Hey mam"), text: t("Oh leuk, ik zie je al vanaf buiten!"), createdAt: 2 },
  { id: "default-sanne", name: t("Sanne"), phrase: t("Hoi Sanne"), text: t("Ik ben er over twee minuten, blijf maar staan."), createdAt: 3 },
];

const DB = "sm-fakecall";
const STORE = "scenarios";
const memory = new Map<string, Scenario>();

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let usingMemory = false;

export async function listScenarios(): Promise<Scenario[]> {
  let stored: Scenario[] = [];
  try {
    if (!usingMemory) stored = await tx<Scenario[]>("readonly", (s) => s.getAll() as IDBRequest<Scenario[]>);
  } catch {
    usingMemory = true;
  }
  if (usingMemory) stored = [...memory.values()];
  // Defaults show until you make your own; an edited default replaces it.
  const ids = new Set(stored.map((s) => s.id));
  const removed = readRemoved();
  const defaults = DEFAULT_SCENARIOS.filter((d) => !ids.has(d.id) && !removed.includes(d.id));
  return [...defaults, ...stored].sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveScenario(s: Scenario): Promise<void> {
  memory.set(s.id, s);
  if (usingMemory) return;
  try {
    await tx("readwrite", (st) => st.put(s));
  } catch {
    usingMemory = true;
  }
}

export async function deleteScenario(id: string): Promise<void> {
  memory.delete(id);
  if (id.startsWith("default-")) writeRemoved([...readRemoved(), id]);
  if (usingMemory) return;
  try {
    await tx("readwrite", (st) => st.delete(id));
  } catch {}
}

export async function clearScenarios(): Promise<void> {
  memory.clear();
  writeRemoved([]);
  try {
    await tx("readwrite", (st) => st.clear());
  } catch {}
}

const REMOVED = "sm.fakecall.removedDefaults";
function readRemoved(): string[] {
  try {
    return JSON.parse(localStorage.getItem(REMOVED) ?? "[]");
  } catch {
    return [];
  }
}
function writeRemoved(ids: string[]) {
  try {
    localStorage.setItem(REMOVED, JSON.stringify(ids));
  } catch {}
}

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
}

// ---------------------------------------------------------------- sound

let ctx: AudioContext | null = null;

/** Call from a tap: browsers only allow sound after the person touched the page. */
export function unlockAudio(): void {
  try {
    ctx ??= new AudioContext();
    void ctx.resume();
  } catch {}
}

/** A plain marimba-like ringtone, made on the device. Returns a stop function. */
export function startRingtone(): () => void {
  const vibrate = () => {
    try {
      navigator.vibrate?.([700, 500, 700, 500, 700]);
    } catch {}
  };
  if (!ctx) {
    vibrate();
    return () => navigator.vibrate?.(0);
  }
  const ac = ctx;
  const notes = [659.25, 783.99, 1046.5, 783.99];
  const ring = () => {
    const t0 = ac.currentTime + 0.05;
    notes.forEach((f, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const t = t0 + i * 0.16;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + 0.32);
    });
    vibrate();
  };
  ring();
  const timer = setInterval(ring, 2200);
  return () => {
    clearInterval(timer);
    try {
      navigator.vibrate?.(0);
    } catch {}
  };
}

/** Play the caller: the recording, or the phone's own voice reading the text. */
export function playCaller(s: Scenario): () => void {
  if (s.audio) {
    const url = URL.createObjectURL(s.audio);
    const el = new Audio(url);
    void el.play().catch(() => {});
    return () => {
      el.pause();
      URL.revokeObjectURL(url);
    };
  }
  try {
    const synth = window.speechSynthesis;
    const u = new SpeechSynthesisUtterance(s.text);
    u.lang = lang === "en" ? "en-GB" : "nl-NL";
    // Prefer a voice that runs on the phone itself.
    const voice = synth.getVoices().find((v) => v.lang.startsWith(lang) && v.localService) ?? synth.getVoices().find((v) => v.lang.startsWith(lang));
    if (voice) u.voice = voice;
    u.rate = 1.02;
    synth.speak(u);
    return () => synth.cancel();
  } catch {
    return () => {};
  }
}
