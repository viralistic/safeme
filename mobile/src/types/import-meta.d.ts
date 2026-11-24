// Shared web modules mention Vite's import.meta.env for types only. In the app,
// metro swaps ../src/lib/city.ts for src/city.ts, so this is never read at runtime.
interface ImportMeta {
  readonly env: Record<string, string | undefined>;
}
