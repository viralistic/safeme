/// <reference types="astro/client" />
interface ImportMetaEnv {
  readonly PUBLIC_API_URL?: string;
  readonly PUBLIC_MAP_STYLE?: string;
  readonly PUBLIC_PLAUSIBLE_DOMAIN?: string;
  /** Set by the single-file demo build (artifact/). */
  readonly PUBLIC_SINGLE_FILE?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
