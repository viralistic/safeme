import Globe from "@/components/shared/Globe";
import { Note112 } from "../ui";
import { ASSETS } from "@/lib/assets";
import { t } from "@/lib/i18n";

const HOTSPOTS = [
  { lat: 18, lon: 25, label: t("Inbraakpoging") },
  { lat: -8, lon: -35, label: t("Overlast") },
  { lat: 42, lon: -8, label: t("Drugsgebruik") },
];

export default function Start({ onAllow, onSkip, busy }: { onAllow: () => void; onSkip: () => void; busy: boolean }) {
  return (
    <section className="screen" aria-labelledby="start-title">
      <div className="absolute inset-0 overflow-hidden">
        <Globe
          texture={ASSETS.globeTex}
          hotspots={HOTSPOTS}
          radius={1.85}
          offset={[1.12, -0.95]}
          fov={50}
          cameraZ={3.2}
          className="absolute inset-0 z-0 block h-full w-full"
          cardClassName="absolute left-1/2 top-[38%] z-[4] -translate-x-1/2 -translate-y-1/2"
        />
        <div className="pointer-events-none absolute -right-12 bottom-24 z-0 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(31,120,220,.4),transparent_62%)] blur-md" />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(to_top,rgba(8,11,18,.95)_22%,rgba(8,11,18,.15)_55%,rgba(8,11,18,.45))]" />
      </div>
      <div className="pointer-events-none relative z-[3] mt-auto px-[26px] pb-7">
        <h1 id="start-title" className="display text-[34px] text-white">
          {t("Zie waar het")}
          <br />
          {t("onveilig is in")}
          <br />
          {t("jouw buurt")}
        </h1>
        <ol className="mt-5 flex flex-col gap-2 text-[14px] leading-snug text-[#cfd3dd]">
          <li><span className="mr-2 text-cyan">1</span>{t("Meld in twee tikken.")}</li>
          <li><span className="mr-2 text-cyan">2</span>{t("Zie wat anderen melden.")}</li>
          <li><span className="mr-2 text-cyan">3</span>{t("Kies een veilige route.")}</li>
        </ol>
        <div className="pointer-events-auto mt-6 flex flex-col gap-1">
          <button type="button" className="btn glass glass-red" onClick={onAllow} disabled={busy}>
            <span>{busy ? t("Even zoeken...") : t("Locatie toestaan")}</span>
          </button>
          <button type="button" className="btn-ghost" onClick={onSkip}>
            {t("Eerst rondkijken")}
          </button>
          <Note112 className="mt-1" />
        </div>
      </div>
    </section>
  );
}
