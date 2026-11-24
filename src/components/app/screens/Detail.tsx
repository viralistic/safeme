import { useState } from "react";
import { getCategory } from "@/lib/categories";
import { level, LEVEL_COLOR, severityLabel } from "@/lib/severity";
import { ago, minutesSince, remaining, shortDuration } from "@/lib/time";
import type { FlagReason, PublicReport } from "@/lib/types";
import Icon from "../Icon";
import { ASSETS } from "@/lib/assets";
import { Note112 } from "../ui";
import { t } from "@/lib/i18n";

interface Props {
  report: PublicReport | null;
  confirmed: boolean;
  own: boolean;
  onBack: () => void;
  onConfirm: () => Promise<boolean>;
  onFlag: (r: FlagReason) => Promise<boolean>;
}

const REASONS: { id: FlagReason; label: string }[] = [
  { id: "onjuist", label: t("Klopt niet of is verzonnen") },
  { id: "persoon", label: t("Richt zich op een persoon of groep") },
  { id: "spam", label: t("Spam of reclame") },
];

export default function Detail({ report, confirmed, own, onBack, onConfirm, onFlag }: Props) {
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!report) {
    return (
      <section className="screen items-center justify-center gap-4 px-8 text-center">
        <h1 className="display text-[24px]">{t("Deze melding is vervaagd")}</h1>
        <p className="text-[13px] text-muted">{t("Meldingen verdwijnen vanzelf na een tijdje.")}</p>
        <button type="button" className="btn glass mt-4" onClick={onBack}>
          <span>{t("Terug naar kaart")}</span>
        </button>
      </section>
    );
  }

  const cat = getCategory(report.category);
  const welfare = !!cat?.welfare;
  const lv = level(report.severity);
  const color = welfare ? "var(--cyan)" : LEVEL_COLOR[lv];
  const eyebrowColor = welfare ? "var(--cyan)" : lv === "low" ? "var(--powder)" : lv === "mid" ? "#e46a74" : "var(--red)";

  async function confirm() {
    setBusy(true);
    await onConfirm();
    setBusy(false);
  }

  async function flag(r: FlagReason) {
    setBusy(true);
    await onFlag(r);
    setBusy(false);
    setFlagged(true);
    setFlagOpen(false);
  }

  return (
    <section className="screen" aria-labelledby="detail-title">
      <div className="relative h-[238px] shrink-0">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${ASSETS.detail})` }} />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(7,10,17,.92)_6%,rgba(7,10,17,.35)_48%,rgba(7,10,17,.15))]" />
        <button type="button" className="chip absolute left-5 top-4 z-10" onClick={onBack} aria-label={t("Terug naar kaart")}>
          <Icon name="back" size={18} />
        </button>
        <div className="absolute inset-x-6 bottom-5 text-white">
          <p className="eyebrow flex items-center gap-2" style={{ color: eyebrowColor }}>
            <i className="block h-2 w-2 rounded-full" style={{ background: color }} aria-hidden="true" />
            {severityLabel(report.severity, welfare)} · {shortDuration(minutesSince(report.created_at))}
          </p>
          <h1 id="detail-title" className="display mt-2.5 text-[30px]">
            {cat?.label ?? t("Melding")}
          </h1>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-6 pt-4">
        <dl className="text-[14px]">
          <Row icon="clock" term={t("Gemeld")} value={ago(report.created_at)} />
          <Row icon="clock" term={t("Vervaagt over")} value={remaining(report.expires_at)} />
          <Row
            icon="users"
            term={t("Herkend door")}
            value={report.confirmations === 0 ? t("nog niemand") : report.confirmations === 1 ? t("1 persoon") : t("{n} mensen", { n: report.confirmations })}
          />
          <Row icon="lock" term={t("Locatie")} value="vervaagd tot ±100m" />
        </dl>
        {report.category === "explosie" && (
          <p className="mt-3 text-[13px] leading-snug text-[#cfd3dd]">
            {t("Na een explosie: blijf uit de buurt tot de hulpdiensten klaar zijn. Woon je ernaast en slaap je er slecht van? Slachtofferhulp helpt ook buren, gratis.")}
          </p>
        )}
        {welfare && (
          <p className="mt-3 text-[13px] leading-snug text-cyan">
            {t("Iemand lijkt hier hulp nodig te hebben. Kijk of het goed gaat, of bel 112 als het niet goed gaat.")}
          </p>
        )}
        <p className="mt-3 text-[12px] leading-snug text-muted">{t("Omschrijvingen zijn niet openbaar. Zo blijft iedereen anoniem.")}</p>

        <div className="mt-auto flex flex-col gap-2 pt-6 pb-5">
          {flagOpen ? (
            <div className="flex flex-col gap-2" role="group" aria-label={t("Waarom is dit misbruik?")}>
              <p className="text-[13px] font-medium">{t("Wat klopt er niet?")}</p>
              {REASONS.map((r) => (
                <button key={r.id} type="button" className="btn glass h-12! justify-start! px-4 text-left font-medium" disabled={busy} onClick={() => flag(r.id)}>
                  <span>{r.label}</span>
                </button>
              ))}
              <button type="button" className="btn-ghost" onClick={() => setFlagOpen(false)}>
                {t("Annuleren")}
              </button>
            </div>
          ) : (
            <>
              <button type="button" className="btn glass" onClick={confirm} disabled={busy || confirmed || own}>
                <span>{own ? t("Dit is jouw melding") : confirmed ? t("Bedankt, je telt mee") : t("Dit herken ik ook")}</span>
              </button>
              {flagged ? (
                <p className="py-3 text-center text-[13px] text-muted" role="status">
                  {t("Bedankt. We kijken ernaar.")}
                </p>
              ) : (
                <button type="button" className="btn-ghost" onClick={() => setFlagOpen(true)} disabled={own}>
                  {t("Rapporteer misbruik")}
                </button>
              )}
              <Note112 />
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Row({ icon, term, value }: { icon: "clock" | "users" | "lock"; term: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-border py-3">
      <Icon name={icon} size={16} className="shrink-0 text-muted" />
      <dt className="flex-1 text-muted">{term}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
