import { useState } from "react";
import Icon from "../Icon";
import { Header, Note112 } from "../ui";

const RULES: { icon: "lock" | "pin" | "clock" | "user"; title: string; body: string }[] = [
  { icon: "pin", title: "Je locatie wordt vervaagd", body: "Elke melding wordt afgerond op een vak van ongeveer 100 meter, voordat hij wordt opgeslagen." },
  { icon: "user", title: "Je blijft anoniem", body: "Geen naam, geen e-mail, geen telefoonnummer. Je toestel krijgt een willekeurige code." },
  { icon: "lock", title: "Omschrijvingen zijn niet openbaar", body: "Een notitie ziet alleen de moderatie. Op de kaart staan alleen categorie, ernst en tijd." },
  { icon: "clock", title: "Meldingen verdwijnen vanzelf", body: "Na een paar uur vervaagt een melding van de kaart. Na 30 dagen wissen we hem helemaal." },
];

export default function Jij({ onReset }: { onReset: () => void }) {
  const [sure, setSure] = useState(false);
  return (
    <section className="screen" aria-labelledby="jij-title">
      <Header title={<span id="jij-title">Jouw privacy</span>} />
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

        <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <p className="text-[14px] font-medium">Geen alarmdienst</p>
          <p className="mt-1 text-[13px] leading-snug text-muted">
            Safety Map helpt je kiezen waar je langs loopt. Bij gevaar of een noodgeval bel je altijd 112. Geen spoed, wel politie? Bel 0900 8844.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2 pb-5">
          {sure ? (
            <>
              <p className="text-center text-[13px] text-muted">Je instellingen, bevestigingen en code op dit toestel worden gewist.</p>
              <button type="button" className="btn glass glass-red" onClick={onReset}>
                <span>Ja, wis alles</span>
              </button>
              <button type="button" className="btn-ghost" onClick={() => setSure(false)}>
                Annuleren
              </button>
            </>
          ) : (
            <button type="button" className="btn glass" onClick={() => setSure(true)}>
              <span>Wis mijn gegevens op dit toestel</span>
            </button>
          )}
          <p className="mt-3 text-center text-[11px] text-muted">
            Safety Map is open source.{" "}
            <a className="underline" href="https://github.com/viralistic/safeme" target="_blank" rel="noopener">
              Bekijk de code
            </a>
          </p>
          <Note112 />
        </div>
      </div>
    </section>
  );
}
