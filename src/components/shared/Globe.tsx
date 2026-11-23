// Rotating contour globe with clickable hotspots (Three.js, bundled).
import { useEffect, useRef, useState } from "react";

export interface Hotspot {
  lat: number;
  lon: number;
  label: string;
}

interface Props {
  texture: string;
  hotspots: Hotspot[];
  radius?: number;
  /** Offset of the globe in scene units, used by the app start screen. */
  offset?: [number, number];
  fov?: number;
  cameraZ?: number;
  className?: string;
  cardClassName?: string;
  label?: string;
}

export default function Globe({
  texture,
  hotspots,
  radius = 1.5,
  offset = [0, 0],
  fov = 46,
  cameraZ = 3.05,
  className,
  cardClassName,
  label = "Draaibare wereldbol met actieve meldingen",
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [card, setCard] = useState<string | null>(null);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    let disposed = false;
    let cleanup = () => {};

    import("three").then((THREE) => {
      if (disposed) return;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true });
      } catch {
        return; // No WebGL: the surrounding glow and copy still carry the screen.
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const scene = new THREE.Scene();
      const cam = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
      cam.position.set(0, 0, cameraZ);
      scene.add(new THREE.AmbientLight(0x2a4a7a, 0.95));
      const dir = new THREE.DirectionalLight(0xbfe0ff, 1.5);
      dir.position.set(-2.2, 2.3, 3);
      scene.add(dir);

      const globe = new THREE.Group();
      globe.position.set(offset[0], offset[1], 0);
      scene.add(globe);

      const tex = new THREE.TextureLoader().load(texture);
      tex.colorSpace = THREE.SRGBColorSpace;
      const sphere = new THREE.SphereGeometry(radius, 80, 80);
      const mat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0x0a1c3a, emissiveIntensity: 0.62, roughness: 1, metalness: 0 });
      globe.add(new THREE.Mesh(sphere, mat));
      const haloGeo = new THREE.SphereGeometry(radius * 1.065, 48, 48);
      const haloMat = new THREE.MeshBasicMaterial({ color: 0x1f78d6, transparent: true, opacity: 0.12, side: THREE.BackSide });
      globe.add(new THREE.Mesh(haloGeo, haloMat));

      const hots: InstanceType<typeof THREE.Mesh>[] = [];
      const dotGeo = new THREE.SphereGeometry(radius * 0.033, 16, 16);
      const glowGeo = new THREE.SphereGeometry(radius * 0.072, 16, 16);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0xed3a2c });
      const glowMat = new THREE.MeshBasicMaterial({ color: 0xed3a2c, transparent: true, opacity: 0.22 });
      const glows: InstanceType<typeof THREE.Mesh>[] = [];
      hotspots.forEach((h) => {
        const r = radius * 1.027;
        const phi = ((90 - h.lat) * Math.PI) / 180;
        const theta = ((h.lon + 180) * Math.PI) / 180;
        const pos = new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.copy(pos);
        dot.userData = { label: h.label };
        globe.add(dot);
        hots.push(dot);
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.copy(pos);
        globe.add(glow);
        glows.push(glow);
      });

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const ray = new THREE.Raycaster();
      let drag = false;
      let moved = 0;
      let px = 0;
      let py = 0;
      let vy = 0;
      let hideT = 0;

      const down = (e: PointerEvent) => {
        drag = true;
        moved = 0;
        px = e.clientX;
        py = e.clientY;
        cv.setPointerCapture(e.pointerId);
      };
      const move = (e: PointerEvent) => {
        if (!drag) return;
        const dx = e.clientX - px;
        const dy = e.clientY - py;
        px = e.clientX;
        py = e.clientY;
        moved += Math.abs(dx) + Math.abs(dy);
        globe.rotation.y += dx * 0.005;
        globe.rotation.x = Math.max(-0.6, Math.min(0.6, globe.rotation.x + dy * 0.004));
        vy = dx * 0.005;
      };
      const up = (e: PointerEvent) => {
        drag = false;
        if (moved >= 6) return;
        const b = cv.getBoundingClientRect();
        ray.setFromCamera(new THREE.Vector2(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1), cam);
        const hit = ray.intersectObjects(hots)[0];
        window.clearTimeout(hideT);
        if (hit) {
          setCard(String(hit.object.userData.label));
          hideT = window.setTimeout(() => setCard(null), 2600);
        } else setCard(null);
      };
      cv.addEventListener("pointerdown", down);
      cv.addEventListener("pointermove", move);
      cv.addEventListener("pointerup", up);

      const resize = () => {
        const w = cv.clientWidth;
        const h = cv.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        cam.aspect = w / h;
        cam.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(cv);
      resize();

      let raf = 0;
      let t = 0;
      const loop = () => {
        if (!drag) {
          globe.rotation.y += (reduced ? 0 : 0.0014) + vy;
          vy *= 0.94;
          if (Math.abs(vy) < 0.0004) vy = 0;
        }
        t += 0.016;
        glows.forEach((g, i) => g.scale.setScalar(1 + 0.35 * ((Math.sin(t * 2.6 + i * 1.3) + 1) / 2)));
        renderer.render(scene, cam);
        raf = requestAnimationFrame(loop);
      };
      loop();

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        cv.removeEventListener("pointerdown", down);
        cv.removeEventListener("pointermove", move);
        cv.removeEventListener("pointerup", up);
        [sphere, haloGeo, dotGeo, glowGeo].forEach((g) => g.dispose());
        [mat, haloMat, dotMat, glowMat].forEach((m) => m.dispose());
        tex.dispose();
        renderer.dispose();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [texture, radius, fov, cameraZ, offset[0], offset[1]]);

  return (
    <>
      <canvas ref={canvas} className={className} style={{ touchAction: "none", cursor: "grab" }} role="img" aria-label={label} />
      <div
        className={`hotcard pointer-events-none transition-all duration-200 ${cardClassName ?? ""} ${card ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
        aria-live="polite"
      >
        <b className="text-[13px] font-semibold text-white">{card ?? "Hotspot"}</b>
        <span className="text-[11px] text-[#ffd9d4]">Actieve melding</span>
      </div>
    </>
  );
}
