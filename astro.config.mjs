import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://safetymap.nl",
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    build: { chunkSizeWarningLimit: 1200 },
    server: { proxy: { "/api": "http://localhost:8787" } },
  },
});
