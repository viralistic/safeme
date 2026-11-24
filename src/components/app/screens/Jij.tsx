import { useState } from "react";
import Icon from "../Icon";
import { Header, Note112 } from "../ui";
import { lang, setLang, t } from "@/lib/i18n";

const RULES: { icon: "lock" | "pin" | "clock" | "user"; title: string; body: string }[] = [
  { icon: "pin", title: t("Je locatie wordt vervaagd"), body: t("Elke melding wordt afgerond op een vak van ongeveer 100 meter, voordat hij wordt opgeslagen.") },
  { icon: "user", title: t("Je blijft anoniem"), body: t("Geen naam, geen e-mail, geen telefoonnummer. Je toestel krijgt een willekeurige code.") },
  { icon: "lock", title: t("Omschrijvingen zijn niet openbaar"), body: t("Een notitie ziet alleen de moderatie. Op de kaart staan alleen categorie, ernst en tijd.") },
  { icon: "clock", title: t("Meldingen verdwijnen vanzelf"), body: t("Na een paar uur vervaagt een melding van de kaart. Na 30 dagen wissen we hem helemaal.") },
];

export default function Jij({ onReset, onCalls }: { onReset: () => void; onCalls: () => void }) {
  const [sure, setSure] = useState(false);
  return (
    <section className="screen" aria-labelledby="jij-title">
      <Header title={<span id="jij-title">{t("Jouw privacy")}</span>} />
      <div className="flex-1 overflow-y-auto px-[22px] pt-5">
        <ul className="flex flex-col">
          {RULES.map((r) => (
            <li key={r.title} className="flex gap-3.5 border-t border-border py-4 first:border-t-0">
              <Icon name={r.icon} size={18} className="mt-0.5 shrink-0 text-cyan" />
              <div>
                <p className="text-[14px] font-medium">{r.title}</p>
                <p className="mt-1 text-[13px] leading-snug text-muted">{r.body}</p>
              </div>
            </li>
          ))}
        </ul>

        <button type="button" className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left" onClick={onCalls}>
          <Icon name="phone" size={18} className="shrink-0 text-cyan" />
          <span className="flex-1">
            <span className="block text-[14px] font-medium">{t("Nepgesprek instellen")}</span>
            <span className="mt-0.5 block text-[13px] leading-snug text-muted">{t("Kies wie er belt en neem hun stem op.")}</span>
          </span>
          <Icon name="back" size={16} className="rotate-180 text-muted" />
        </button>

        <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <p className="text-[14px] font-medium">{t("Geen alarmdienst")}</p>
          <p className="mt-1 text-[13px] leading-snug text-muted">
            {t("Safety Map helpt je kiezen waar je langs loopt. Bij gevaar of een noodgeval bel je altijd 112. Geen spoed, wel politie? Bel 0900 8844.")}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2 pb-5">
          {sure ? (
            <>
              <p className="text-center text-[13px] text-muted">{t("Je instellingen, bevestigingen en code op dit toestel worden gewist.")}</p>
              <button type="button" className="btn glass glass-red" onClick={onReset}>
                <span>{t("Ja, wis alles")}</span>
              </button>
              <button type="button" className="btn-ghost" onClick={() => setSure(false)}>
                {t("Annuleren")}
              </button>
            </>
          ) : (
            <button type="button" className="btn glass" onClick={() => setSure(true)}>
              <span>{t("Wis mijn gegevens op dit toestel")}</span>
            </button>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-border pt-4">
            <span id="lang-label" className="text-[14px] font-medium">
              {t("Taal")}
            </span>
            <div className="flex gap-2" role="radiogroup" aria-labelledby="lang-label">
              {(["nl", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={lang === l}
                  onClick={() => lang !== l && setLang(l)}
                  className={`h-10 rounded-xl border px-4 text-[13px] font-medium ${lang === l ? "border-[rgba(255,170,160,.35)] bg-[rgba(237,58,44,.22)] text-white" : "border-border bg-surface text-muted"}`}
                >
                  {l === "nl" ? "Nederlands" : "English"}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 text-center text-[11px] text-muted">
            Safety Map is open source.{" "}
            <a className="underline" href="https://github.com/viralistic/safeme" target="_blank" rel="noopener">
              {t("Bekijk de code")}
            </a>
          </p>
          <Note112 />
        </div>
      </div>
    </section>
  );
}
