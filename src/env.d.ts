/// <reference types="astro/client" />
interface ImportMetaEnv {
  readonly PUBLIC_API_URL?: string;
  readonly PUBLIC_MAP_STYLE?: string;
  readonly PUBLIC_PLAUSIBLE_DOMAIN?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
