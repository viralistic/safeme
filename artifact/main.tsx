// Single-file demo build: the real app in demo mode, with map tiles for
// Amsterdam Oost embedded so it runs without any network access.
import { createRoot } from "react-dom/client";
import maplibregl from "maplibre-gl";
import App from "@/components/app/App";
import { configureMap } from "@/components/app/MapView";
import "@/styles/global.css";
import "@/styles/app.css";
import tiles from "./data/tiles.json";
import baseStyle from "./data/style.json";

const TILES = tiles as Record<string, string>;

async function gunzip(b64: string): Promise<ArrayBuffer> {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).arrayBuffer();
}

maplibregl.addProtocol("embedded", async (params) => {
  const path = params.url.replace("embedded://", "");
  const key = path.startsWith("glyphs/") ? `glyphs/${path.split("/").pop()}` : path;
  const data = TILES[key];
  return { data: data ? await gunzip(data) : new ArrayBuffer(0) };
});

configureMap(async () => ({
  style: baseStyle as never,
  minZoom: 12,
  maxBounds: [
    [4.89, 52.338],
    [4.966, 52.384],
  ],
}));

// The SVG filter behind the liquid-glass controls.
document.body.insertAdjacentHTML(
  "afterbegin",
  `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="liquid" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="2" seed="7" result="n"></feTurbulence><feGaussianBlur in="n" stdDeviation="0.4" result="nb"></feGaussianBlur><feDisplacementMap in="SourceGraphic" in2="nb" scale="42" xChannelSelector="R" yChannelSelector="G"></feDisplacementMap></filter></svg>`,
);
document.body.style.background = "#070b12";
document.body.style.margin = "0";

createRoot(document.getElementById("root")!).render(<App />);
