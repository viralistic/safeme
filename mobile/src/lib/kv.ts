// Small key-value store in one JSON file on the phone. Secrets go in SecureStore instead.
import { File, Paths } from "expo-file-system";

const file = new File(Paths.document, "safety-map.json");
let cache: Record<string, unknown> | null = null;

function load(): Record<string, unknown> {
  if (cache) return cache;
  try {
    cache = file.exists ? JSON.parse(file.textSync() || "{}") : {};
  } catch {
    cache = {};
  }
  return cache!;
}

export function get<T>(key: string, fallback: T): T {
  const v = load()[key];
  return v === undefined ? fallback : (v as T);
}

export function set(key: string, value: unknown): void {
  const data = load();
  if (value === undefined) delete data[key];
  else data[key] = value;
  try {
    if (!file.exists) file.create();
    file.write(JSON.stringify(data));
  } catch {}
}

export function clearAll(): void {
  cache = {};
  try {
    if (file.exists) file.delete();
  } catch {}
}
