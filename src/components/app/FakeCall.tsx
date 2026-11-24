// The sheet that starts a fake call, and the call screen itself. The call
// screen copies a phone's incoming call and never shows the app's name.
import { useEffect, useRef, useState } from "react";
import { listScenarios, playCaller, startRingtone, unlockAudio, type Scenario } from "@/lib/fakecall";
import Icon from "./Icon";
import { t } from "@/lib/i18n";

const DELAYS = [
  { s: 0, label: t("Nu") },
  { s: 10, label: "10 sec" },
  { s: 30, label: "30 sec" },
  { s: 60, label: "1 min" },
];

export function CallSheet({ onStart, onClose, onSetup }: { onStart: (s: Scenario, delaySec: number) => void; onClose: () => void; onSetup: () => void }) {
  const [list, setList] = useState<Scenario[]>([]);
  const [pick, setPick] = useState<string | null>(null);
  const [delay, setDelay] = useState(10);
  useEffect(() => {
    listScenarios().then((l) => {
      setList(l);
      setPick(l[0]?.id ?? null);
    });
  }, []);
  const chosen = list.find((s) => s.id === pick);

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end bg-[rgba(4,6,10,.55)]" onClick={onClose}>
      <section
        className="rounded-t-[24px] border-t border-border bg-[#0b0e16] px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+20px)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="call-title"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 id="call-title" className="display text-[24px]">{t("Bel me op speaker")}</h2>
            <p className="mt-1 text-[13px] text-muted">{t("Een nepgesprek, zodat je een uitweg hebt.")}</p>
          </div>
          <button type="button" className="chip" onClick={onClose} aria-label={t("Sluiten")}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-2" role="radiogroup" aria-label={t("Wie belt er")}>
          {list.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={pick === s.id}
              onClick={() => setPick(s.id)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left ${pick === s.id ? "border-[rgba(255,170,160,.35)] bg-[rgba(237,58,44,.18)]" : "border-border bg-surface"}`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface2 text-[14px] font-semibold">{s.name.slice(0, 1)}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium">{s.name}</span>
                <span className="block truncate text-[12px] text-muted">{t("Zeg")}: "{s.phrase}"</span>
              </span>
              <span className="text-[11px] text-muted">{s.audio ? t("eigen opname") : t("voorgelezen")}</span>
            </button>
          ))}
        </div>

        <p id="delay-label" className="mt-5 text-[13px] font-medium">{t("Wanneer")}</p>
        <div className="mt-2 grid grid-cols-4 gap-2" role="radiogroup" aria-labelledby="delay-label">
          {DELAYS.map((d) => (
            <button
              key={d.s}
              type="button"
              role="radio"
              aria-checked={delay === d.s}
              onClick={() => setDelay(d.s)}
              className={`h-11 rounded-xl border text-[13px] font-medium ${delay === d.s ? "border-[rgba(255,170,160,.35)] bg-[rgba(237,58,44,.22)] text-white" : "border-border bg-surface text-muted"}`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="btn glass glass-red mt-5"
          disabled={!chosen}
          onClick={() => {
            unlockAudio();
            if (chosen) onStart(chosen, delay);
          }}
        >
          <span>{delay === 0 ? t("Bel me nu") : t("Bel me over {delay}", { delay: DELAYS.find((d) => d.s === delay)?.label ?? "" })}</span>
        </button>
        <button type="button" className="btn-ghost mt-1" onClick={onSetup}>
          {t("Gesprekken instellen")}
        </button>
      </section>
    </div>
  );
}

function clock(sec: number) {
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}

export function CallScreen({ scenario, onEnd }: { scenario: Scenario; onEnd: () => void }) {
  const [state, setState] = useState<"ringing" | "active">("ringing");
  const [sec, setSec] = useState(0);
  const stopRing = useRef<() => void>(() => {});
  const stopVoice = useRef<() => void>(() => {});

  useEffect(() => {
    const title = document.title;
    document.title = scenario.name;
    stopRing.current = startRingtone();
    return () => {
      stopRing.current();
      stopVoice.current();
      document.title = title;
    };
  }, []);

  useEffect(() => {
    if (state !== "active") return;
    const t = setInterval(() => setSec((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [state]);

  function answer() {
    stopRing.current();
    setState("active");
    // A short pause, as when someone picks up.
    setTimeout(() => (stopVoice.current = playCaller(scenario)), 700);
  }

  function hangUp() {
    stopRing.current();
    stopVoice.current();
    onEnd();
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center bg-[linear-gradient(180deg,#1c1f26,#0d0f14)] px-8 pt-[calc(env(safe-area-inset-top)+72px)] pb-[calc(env(safe-area-inset-bottom)+56px)] text-white" role="dialog" aria-label={`Inkomend gesprek van ${scenario.name}`}>
      <div className="grid h-24 w-24 place-items-center rounded-full bg-[#3a3f4b] text-[40px] font-light">{scenario.name.slice(0, 1)}</div>
      <p className="mt-6 text-[34px] font-light tracking-tight">{scenario.name}</p>
      <p className="mt-1 text-[16px] text-white/60">{state === "ringing" ? t("mobiel") : clock(sec)}</p>

      {state === "active" && (
        <div className="mt-auto mb-12 grid grid-cols-3 gap-x-8 gap-y-6 text-center text-[12px] text-white/80">
          {[t("dempen"), t("toetsen"), "speaker", t("gesprek +"), "FaceTime", t("contacten")].map((l) => (
            <div key={l} className="flex flex-col items-center gap-2">
              <span className={`h-16 w-16 rounded-full ${l === "speaker" ? "bg-white" : "bg-white/15"}`} aria-hidden="true" />
              {l}
            </div>
          ))}
        </div>
      )}

      <div className={`${state === "ringing" ? "mt-auto" : ""} flex w-full justify-around`}>
        {state === "ringing" ? (
          <>
            <CallButton color="#ff3b30" label={t("Weiger")} onClick={hangUp} rotate />
            <CallButton color="#34c759" label={t("Accepteer")} onClick={answer} />
          </>
        ) : (
          <CallButton color="#ff3b30" label={t("Beëindig")} onClick={hangUp} rotate />
        )}
      </div>
    </div>
  );
}

function CallButton({ color, label, onClick, rotate }: { color: string; label: string; onClick: () => void; rotate?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 text-[13px] text-white/80">
      <button type="button" onClick={onClick} aria-label={label} className="grid h-[72px] w-[72px] place-items-center rounded-full" style={{ background: color }}>
        <Icon name="phone" size={30} className={rotate ? "rotate-[135deg]" : ""} />
      </button>
      {label}
    </div>
  );
}
