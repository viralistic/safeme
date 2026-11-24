import { useState } from "react";
import { getCategory } from "@/lib/categories";
import { level, LEVEL_COLOR, severityLabel } from "@/lib/severity";
import type { LocationSource } from "@/lib/geo";
import Icon from "../Icon";
import { Header } from "../ui";
import { t } from "@/lib/i18n";

interface Props {
  category: string;
  severity: number;
  note: string;
  locationSource: LocationSource;
  busy: boolean;
  error: string | null;
  onSeverity: (n: number) => void;
  onNote: (s: string) => void;
  hate?: boolean;
  /** Only for "Overkomt mij": a private hate-motive tag. */
  onHate?: (on: boolean) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export default function MeldenErnst({ category, severity, note, locationSource, busy, error, onSeverity, onNote, hate, onHate, onBack, onSubmit }: Props) {
  const cat = getCategory(category);
  const welfare = !!cat?.welfare;
  const [noteOpen, setNoteOpen] = useState(note.length > 0);
  const lv = level(severity);
  const label = severityLabel(severity, welfare);
  const color = welfare ? (lv === "low" ? "var(--powder)" : "var(--cyan)") : LEVEL_COLOR[lv];

  return (
    <section className="screen" aria-labelledby="ernst-title">
      <div className={`wash ${welfare ? "welfare" : "danger"}`} style={{ opacity: (severity / 100).toFixed(2) }} />
      <Header
        title={
          <span id="ernst-title">
            {welfare ? (
              <>{t("Hoe dringend")}<br />{t("lijkt het?")}</>
            ) : (
              <>{t("Hoe onveilig")}<br />{t("voelt het?")}</>
            )}
          </span>
        }
        onBack={onBack}
      />
      <div className="relative z-10 flex flex-1 flex-col overflow-y-auto px-[22px] pt-8">
        <p className="eyebrow text-muted">{cat?.label}</p>
        <div className="display mt-2 text-[36px] font-semibold" style={{ color }} aria-hidden="true">
          {label}
        </div>
        <div className={`spec-track ${welfare ? "welfare" : "danger"}`}>
          <input
            className="spec-range"
            type="range"
            min={0}
            max={100}
            value={severity}
            onChange={(e) => onSeverity(Number(e.target.value))}
            aria-label={welfare ? t("Hoe dringend") : t("Hoe onveilig")}
            aria-valuetext={label}
          />
        </div>
        <div className="mt-3.5 flex justify-between text-[10px] font-semibold uppercase tracking-[.12em] text-muted">
          <span>{welfare ? t("Kan wachten") : t("Onprettig")}</span>
          <span>{welfare ? t("Direct hulp") : t("Direct gevaar")}</span>
        </div>

        {cat?.urgent ? (
          <p className="mt-6 rounded-xl border border-[rgba(255,170,160,.35)] bg-[rgba(237,58,44,.22)] px-4 py-3 text-[14px] leading-snug text-white" role="alert">
            {t("Is er gevaar of zie je vuur of rook? Bel eerst")} <b className="font-semibold">112</b>. {t("Melden kan daarna, zodat de buren het weten.")}
          </p>
        ) : (
          lv === "high" && (
            <p className="mt-6 rounded-xl border border-[rgba(255,170,160,.35)] bg-[rgba(237,58,44,.14)] px-4 py-3 text-[13px] leading-snug text-white" role="note">
              {t("Is er nu gevaar? Bel eerst")} <b className="font-semibold">112</b>. {t("Melden kan daarna.")}
            </p>
          )
        )}

        <div className="mt-8 flex items-center gap-3 border-t border-border py-4">
          <Icon name="pin" size={18} className="shrink-0 text-muted" />
          <div className="flex-1 text-[13px] font-medium">
            {locationSource === "device" ? t("Jouw locatie") : t("Midden van de kaart")}
            <span className="text-[11px] font-light text-muted">{" "}{t("· vervaagd tot ±100m")}</span>
          </div>
        </div>

        {cat?.private && (
          <p className="mb-4 rounded-xl border border-border bg-surface px-4 py-3 text-[13px] leading-snug text-[#cfd3dd]" role="note">
            {t("Deze melding komt niet op de openbare kaart. Alleen de politie ziet hem, en pas als nog iemand dezelfde plek meldt. Beschrijf wat je hoorde of zag, niet hoe iemand eruitziet.")}
          </p>
        )}

        {onHate && (
          <div className="mb-4 flex items-center justify-between gap-4 border-b border-border pb-4">
            <span id="hate-label" className="text-[13px] leading-snug">
              {t("Het ging om wie ik ben")}
              <span className="block text-[11px] text-muted">{t("Alleen moderatie en politie zien dit.")}</span>
            </span>
            <button type="button" role="switch" aria-checked={!!hate} aria-labelledby="hate-label" className="switch" onClick={() => onHate(!hate)} />
          </div>
        )}

        {noteOpen ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="note" className="text-[12px] text-muted">
              {t("Notitie, alleen zichtbaar voor de moderatie. Beschrijf wat er gebeurt, niet hoe iemand eruitziet.")}
            </label>
            <textarea
              id="note"
              value={note}
              maxLength={280}
              rows={3}
              onChange={(e) => onNote(e.target.value)}
              className="resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-[14px] text-fg placeholder:text-muted focus:border-cyan focus:outline-none"
              placeholder={t("Bijvoorbeeld: iemand probeert fietsen open te breken")}
            />
            <span className="self-end text-[10px] text-muted">{note.length}/280</span>
          </div>
        ) : (
          <button type="button" className="btn-ghost justify-start! p-0" onClick={() => setNoteOpen(true)}>
            {t("+ Notitie voor de moderatie")}
          </button>
        )}
      </div>
      <div className="relative z-10 px-[22px] pt-3 pb-5">
        {error && (
          <p className="mb-3 text-center text-[13px] text-[#ffd9d4]" role="alert">
            {error}
          </p>
        )}
        <button type="button" className="btn glass glass-red" onClick={onSubmit} disabled={busy}>
          <span>{busy ? t("Bezig met plaatsen...") : t("Melding plaatsen")}</span>
        </button>
      </div>
    </section>
  );
}
