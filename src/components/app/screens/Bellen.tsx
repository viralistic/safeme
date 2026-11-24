// Set up fake calls: who calls, what you say, and their own recorded voice.
import { useEffect, useRef, useState } from "react";
import { deleteScenario, listScenarios, newId, playCaller, saveScenario, type Scenario } from "@/lib/fakecall";
import Icon from "../Icon";
import { Header } from "../ui";

export default function Bellen({ onBack }: { onBack: () => void }) {
  const [list, setList] = useState<Scenario[]>([]);
  const [edit, setEdit] = useState<Scenario | null>(null);
  const reload = () => listScenarios().then(setList);
  useEffect(() => void reload(), []);

  if (edit) return <Editor scenario={edit} onDone={() => (setEdit(null), reload())} />;

  return (
    <section className="screen" aria-labelledby="bellen-title">
      <Header title={<span id="bellen-title">Nepgesprek</span>} onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-[22px] pt-4 pb-6">
        <p className="text-[14px] leading-snug text-[#cfd3dd]">
          Stel vooraf in wie er belt en wat diegene zegt. Op de kaart start je het gesprek met de belknop. Het scherm lijkt op een gewoon telefoongesprek.
        </p>
        <p className="mt-2 text-[12px] text-muted">Opnames blijven op je telefoon en worden nooit verstuurd.</p>
        <ul className="mt-5 flex flex-col gap-2">
          {list.map((s) => (
            <li key={s.id} className="rounded-xl border border-border bg-surface px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface2 text-[14px] font-semibold">{s.name.slice(0, 1)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium">{s.name}</p>
                  <p className="truncate text-[12px] text-muted">Jij zegt: "{s.phrase}"</p>
                </div>
                <button type="button" className="chip h-10! w-10!" onClick={() => setEdit(s)} aria-label={`${s.name} aanpassen`}>
                  <Icon name="mic" size={16} />
                </button>
              </div>
              <p className="mt-2 text-[13px] leading-snug text-[#cfd3dd]">"{s.text}"</p>
              <p className="mt-1 text-[11px] text-muted">{s.audio ? "Eigen opname" : "Wordt voorgelezen door je telefoon tot je een opname maakt"}</p>
            </li>
          ))}
        </ul>
        <button type="button" className="btn glass mt-4" onClick={() => setEdit({ id: newId(), name: "", phrase: "", text: "", audio: null, createdAt: Date.now() })}>
          <span>Nieuw gesprek</span>
        </button>
      </div>
    </section>
  );
}

function Editor({ scenario, onDone }: { scenario: Scenario; onDone: () => void }) {
  const [s, setS] = useState<Scenario>(scenario);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const stopPreview = useRef<() => void>(() => {});
  const valid = s.name.trim() && s.text.trim();

  async function record() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const r = new MediaRecorder(stream);
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setS((v) => ({ ...v, audio: new Blob(chunks, { type: r.mimeType || "audio/webm" }) }));
        setRecording(false);
      };
      r.start();
      rec.current = r;
      setRecording(true);
      setTimeout(() => r.state === "recording" && r.stop(), 30_000);
    } catch {
      setError("Je microfoon is niet beschikbaar. Je kunt ook een geluidsbestand kiezen.");
    }
  }

  return (
    <section className="screen" aria-labelledby="edit-title">
      <Header title={<span id="edit-title">{scenario.name || "Nieuw gesprek"}</span>} onBack={onDone} />
      <form
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-[22px] pt-4 pb-6"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid) return;
          await saveScenario({ ...s, name: s.name.trim(), phrase: s.phrase.trim() || `Hoi ${s.name.trim()}`, text: s.text.trim() });
          onDone();
        }}
      >
        <Field id="fc-name" label="Naam op het scherm" value={s.name} placeholder="Pap" onChange={(name) => setS({ ...s, name })} />
        <Field id="fc-phrase" label="Wat jij zegt als je opneemt" value={s.phrase} placeholder="Hey pap" onChange={(phrase) => setS({ ...s, phrase })} />
        <label htmlFor="fc-text" className="flex flex-col gap-1.5 text-[12px] text-muted">
          Wat diegene zegt
          <textarea
            id="fc-text"
            rows={3}
            maxLength={240}
            value={s.text}
            onChange={(e) => setS({ ...s, text: e.target.value })}
            placeholder="Ik sta om de hoek met de auto, waar ben je?"
            className="resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-[14px] text-fg focus:border-cyan focus:outline-none"
          />
        </label>

        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-[14px] font-medium">Opname</p>
          <p className="mt-1 text-[12px] leading-snug text-muted">Laat diegene de tekst inspreken, of kies een bestand. Zonder opname leest je telefoon de tekst voor.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {recording ? (
              <button type="button" className="btn glass glass-red h-11! w-auto! px-4" onClick={() => rec.current?.stop()}>
                <Icon name="stop" size={16} />
                <span>Stop</span>
              </button>
            ) : (
              <button type="button" className="btn glass h-11! w-auto! px-4" onClick={record}>
                <Icon name="mic" size={16} />
                <span>Opnemen</span>
              </button>
            )}
            <button
              type="button"
              className="btn glass h-11! w-auto! px-4"
              onClick={() => {
                stopPreview.current();
                stopPreview.current = playCaller(s);
              }}
              disabled={!s.audio && !s.text}
            >
              <Icon name="play" size={16} />
              <span>Luister</span>
            </button>
            {s.audio && (
              <button type="button" className="btn glass h-11! w-auto! px-4" onClick={() => setS({ ...s, audio: null })}>
                <Icon name="trash" size={16} />
                <span>Opname wissen</span>
              </button>
            )}
          </div>
          <label htmlFor="fc-file" className="mt-3 block text-[12px] text-muted">
            Of kies een geluidsbestand
            <input
              id="fc-file"
              type="file"
              accept="audio/*"
              className="mt-1 block w-full text-[12px] text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface2 file:px-3 file:py-2 file:text-fg"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setS({ ...s, audio: f });
              }}
            />
          </label>
          {error && (
            <p className="mt-2 text-[12px] text-[#ffd9d4]" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-1 pt-2">
          <button type="submit" className="btn glass glass-red" disabled={!valid}>
            <span>Bewaar</span>
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={async () => {
              await deleteScenario(s.id);
              onDone();
            }}
          >
            Verwijder dit gesprek
          </button>
        </div>
      </form>
    </section>
  );
}

function Field({ id, label, value, placeholder, onChange }: { id: string; label: string; value: string; placeholder: string; onChange: (v: string) => void }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5 text-[12px] text-muted">
      {label}
      <input
        id={id}
        value={value}
        maxLength={40}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-xl border border-border bg-surface px-3 text-[14px] text-fg focus:border-cyan focus:outline-none"
      />
    </label>
  );
}
