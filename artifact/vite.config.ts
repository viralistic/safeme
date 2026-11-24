// Builds the app as one self-contained HTML file (demo mode, embedded map).
// Needs artifact/data/{tiles,style}.json, see artifact/README.md.
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  envPrefix: "PUBLIC_",
  define: {
    "import.meta.env.PUBLIC_API_URL": JSON.stringify(""),
    "import.meta.env.PUBLIC_DEMO": JSON.stringify("true"),
    "import.meta.env.PUBLIC_PLAUSIBLE_DOMAIN": JSON.stringify(""),
    "import.meta.env.PUBLIC_SINGLE_FILE": JSON.stringify("true"),
  },
  resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
  esbuild: { jsx: "automatic" },
  plugins: [tailwindcss(), viteSingleFile()],
  build: { outDir: "dist", emptyOutDir: true, assetsInlineLimit: 100_000_000, chunkSizeWarningLimit: 20_000 },
});
