/// <reference types="astro/client" />
interface ImportMetaEnv {
  readonly PUBLIC_API_URL?: string;
  /** "true" runs without a server, data only on this device. */
  readonly PUBLIC_DEMO?: string;
  /** A MapLibre style URL, or "self" for tiles served from the server's TILES_DIR. */
  readonly PUBLIC_MAP_STYLE?: string;
  readonly PUBLIC_TILES_FILE?: string;
  readonly PUBLIC_PLAUSIBLE_DOMAIN?: string;
  /** Set by the single-file demo build (artifact/). */
  readonly PUBLIC_SINGLE_FILE?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
