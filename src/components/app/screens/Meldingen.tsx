import { useState } from "react";
import type { AlertPrefs } from "@/lib/prefs";
import { pushSupported } from "@/lib/push";
import Icon from "../Icon";
import { Header, Note112 } from "../ui";
import { t } from "@/lib/i18n";

interface Props {
  prefs: AlertPrefs;
  busy: boolean;
  status: string | null;
  onPush: (on: boolean) => void;
  onOnlyHigh: (on: boolean) => void;
  onRadius: (r: AlertPrefs["radiusM"]) => void;
  onArea: () => void;
}

const RADII: AlertPrefs["radiusM"][] = [500, 1000, 2000];

export default function Meldingen({ prefs, busy, status, onPush, onOnlyHigh, onRadius, onArea }: Props) {
  const [supported] = useState(pushSupported);
  return (
    <section className="screen" aria-labelledby="alerts-title">
      <Header title={<span id="alerts-title">{t("Meldingen")}</span>} />
      <div className="flex-1 overflow-y-auto px-[22px] pt-6">
        <Toggle label={t("Push bij nieuwe melding")} checked={prefs.push} disabled={busy || !supported} onChange={onPush} />
        <Toggle label={t("Alleen direct gevaar")} checked={prefs.onlyHigh} disabled={!prefs.push} onChange={onOnlyHigh} />
        {!supported && <p className="pb-2 text-[12px] text-muted">{t("Je browser ondersteunt geen pushmeldingen. Zet de app op je beginscherm en probeer het opnieuw.")}</p>}
        {status && (
          <p className="pb-2 text-[12px] text-muted" role="status">
            {status}
          </p>
        )}

        <div className="mt-3 flex items-center gap-3 border-t border-border py-[18px]">
          <Icon name="pin" size={18} className="shrink-0 text-muted" />
          <div className="flex-1">
            <div className="text-[14px] font-medium">{prefs.areaName ?? t("Nog geen gebied")}</div>
            <div className="text-[11px] text-muted">{t("Je gebied wordt vervaagd tot ±500m")}</div>
          </div>
          <button type="button" className="eyebrow rounded-md px-2 py-2 text-red hover:text-white" onClick={onArea}>
            {prefs.area ? t("Wijzig") : t("Kies")}
          </button>
        </div>

        <div className="border-t border-border py-[18px]">
          <p id="radius-label" className="text-[14px] font-medium">{t("Straal")}</p>
          <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="radius-label">
            {RADII.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={prefs.radiusM === r}
                onClick={() => onRadius(r)}
                className={`h-11 rounded-xl border text-[13px] font-medium ${prefs.radiusM === r ? "border-[rgba(255,170,160,.35)] bg-[rgba(237,58,44,.22)] text-white" : "border-border bg-surface text-muted hover:text-fg"}`}
              >
                {r < 1000 ? `${r} m` : `${r / 1000} km`}
              </button>
            ))}
          </div>
        </div>
        <p className="pt-2 text-[12px] leading-snug text-muted">
          {t("Je krijgt alleen een seintje voor meldingen in je gebied. Safety Map is geen alarmdienst.")}
        </p>
        <Note112 className="mt-6 pb-4" />
      </div>
    </section>
  );
}

function Toggle({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={`flex items-center justify-between border-t border-border py-5 first:border-t-0 ${disabled ? "opacity-50" : ""}`}>
      <span className="text-[14px] font-medium" id={`t-${label}`}>
        {label}
      </span>
      <button type="button" role="switch" aria-checked={checked} aria-labelledby={`t-${label}`} className="switch" disabled={disabled} onClick={() => onChange(!checked)} />
    </div>
  );
}
