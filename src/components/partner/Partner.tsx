// Partner portal: police, buurtteams and moderators. Same map, more tools,
// never who reported.
import { useEffect, useMemo, useState } from "react";
import MapView, { type MapExtra } from "@/components/app/MapView";
import { getCategory } from "@/lib/categories";
import { DEFAULT_CENTER } from "@/lib/geo";
import type { LatLon } from "@/lib/fuzz";
import { ago } from "@/lib/time";
import { call, ERRORS, getToken, PartnerError, setToken, type Account, type PartnerMap, type QueueItem, type Role } from "./api";

const ROLE_LABEL: Record<Role, string> = { police: "Politie", buurtteam: "Buurtteam", moderator: "Moderator" };

export default function Partner() {
  const [me, setMe] = useState<{ name: string; role: Role } | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!getToken()) return setChecked(true);
    call<{ name: string; role: Role }>("GET", "/partner/me")
      .then(setMe)
      .catch(() => setToken(null))
      .finally(() => setChecked(true));
  }, []);

  if (!checked) return null;
  return (
    <div className="min-h-dvh bg-page">
      {me ? (
        <Dashboard
          me={me}
          onLogout={() => {
            call("POST", "/partner/logout").catch(() => {});
            setToken(null);
            setMe(null);
          }}
        />
      ) : (
        <Login onIn={setMe} />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ login

function Login({ onIn }: { onIn: (m: { name: string; role: Role }) => void }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [role, setRole] = useState<Role>("police");
  const [f, setF] = useState({ email: "", password: "", name: "", invite: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "in") {
        const out = await call<{ token: string; name: string; role: Role }>("POST", "/partner/login", { email: f.email, password: f.password });
        setToken(out.token);
        onIn(out);
      } else {
        const out = await call<{ status: string; token?: string; name?: string; role?: Role }>("POST", "/partner/signup", { ...f, role });
        if (out.token && out.role && out.name) {
          setToken(out.token);
          onIn({ name: out.name, role: out.role });
        } else setMsg("Aanvraag ontvangen. Een moderator keurt je account goed, daarna kun je inloggen.");
      }
    } catch (err) {
      setMsg(ERRORS[(err as PartnerError).code] ?? ERRORS.unknown);
    }
    setBusy(false);
  }

  const input = "h-12 w-full rounded-xl border border-border bg-surface px-3 text-[14px] text-fg focus:border-cyan focus:outline-none";
  return (
    <main className="mx-auto flex max-w-[420px] flex-col gap-6 px-5 py-14">
      <div className="flex items-center gap-3">
        <img src="/icons/icon-160.png" alt="" width={40} height={40} className="rounded-xl" />
        <div>
          <h1 className="display text-[26px]">Safety Map voor partners</h1>
          <p className="text-[13px] text-muted">Politie, buurtteams en moderatoren</p>
        </div>
      </div>
      <p className="text-[14px] leading-relaxed text-[#cfd3dd]">
        Zie waar mensen zich onveilig voelen en plan je ronde of avondwandeling daarop. Je ziet nooit wie er meldde.
      </p>
      <div className="flex gap-6" role="tablist">
        {(["in", "up"] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} type="button" onClick={() => setMode(m)} className={`border-b-2 pb-2 text-[14px] font-semibold ${mode === m ? "border-red text-fg" : "border-transparent text-muted"}`}>
            {m === "in" ? "Inloggen" : "Account aanvragen"}
          </button>
        ))}
      </div>
      <form className="flex flex-col gap-3" onSubmit={submit}>
        {mode === "up" && (
          <>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Soort account">
              {(["police", "buurtteam", "moderator"] as Role[]).map((r) => (
                <button key={r} type="button" role="radio" aria-checked={role === r} onClick={() => setRole(r)} className={`h-11 rounded-xl border text-[13px] font-medium ${role === r ? "border-[rgba(255,170,160,.35)] bg-[rgba(237,58,44,.22)] text-white" : "border-border bg-surface text-muted"}`}>
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>
            <label className="text-[12px] text-muted" htmlFor="p-name">
              {role === "buurtteam" ? "Naam van het buurtteam" : role === "police" ? "Team of wijk" : "Je naam"}
              <input id="p-name" className={`${input} mt-1`} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            </label>
          </>
        )}
        <label className="text-[12px] text-muted" htmlFor="p-email">
          {mode === "up" && role === "police" ? "E-mailadres (politie.nl)" : "E-mailadres"}
          <input id="p-email" type="email" autoComplete="email" className={`${input} mt-1`} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </label>
        <label className="text-[12px] text-muted" htmlFor="p-pw">
          Wachtwoord
          <input id="p-pw" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} className={`${input} mt-1`} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        </label>
        {mode === "up" && role !== "police" && (
          <label className="text-[12px] text-muted" htmlFor="p-invite">
            Uitnodigingscode van een moderator
            <input id="p-invite" className={`${input} mt-1 uppercase`} value={f.invite} onChange={(e) => setF({ ...f, invite: e.target.value })} />
          </label>
        )}
        {msg && (
          <p className="text-[13px] text-[#ffd9d4]" role="alert">
            {msg}
          </p>
        )}
        <button type="submit" className="btn glass glass-red mt-2" disabled={busy}>
          <span>{mode === "in" ? "Inloggen" : "Aanvragen"}</span>
        </button>
      </form>
      <p className="text-[12px] text-muted">Bij nood: bel altijd 112.</p>
    </main>
  );
}

// ------------------------------------------------------------------ dashboard

function Dashboard({ me, onLogout }: { me: { name: string; role: Role }; onLogout: () => void }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<PartnerMap | null>(null);
  const [center, setCenter] = useState<LatLon>(DEFAULT_CENTER);
  const [flyKey, setFlyKey] = useState(0);
  const [view, setView] = useState<LatLon>(DEFAULT_CENTER);
  const [info, setInfo] = useState<string | null>(null);

  const load = () => call<PartnerMap>("GET", `/partner/map?days=${days}`).then(setData).catch(() => {});
  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [days]);

  const fly = (p: LatLon) => {
    setCenter(p);
    setFlyKey((k) => k + 1);
  };

  const extras: MapExtra[] = useMemo(
    () => [
      ...(data?.signals ?? []).map((s, i) => ({ id: `s${i}`, lat: s.lat, lon: s.lon, kind: "signal" as const, label: `Signaal uitbuiting: ${s.reporters} melders, laatst ${ago(s.last)}` })),
      ...(data?.walks ?? []).map((w) => ({ id: w.id, lat: w.lat, lon: w.lon, kind: "walk" as const, label: `${w.team} loopt hier` })),
    ],
    [data],
  );

  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    data?.reports.forEach((r) => m.set(r.category, (m.get(r.category) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);
  const hateCount = data?.reports.filter((r) => r.hate).length ?? 0;
  const maxHour = Math.max(1, ...(data?.hours ?? [0]));

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:flex-row">
      <div className="relative h-[55dvh] lg:h-auto lg:flex-1">
        <MapView reports={data?.reports ?? []} center={center} flyKey={flyKey} me={null} extras={extras} onExtra={(e) => setInfo(e.label)} onSelect={(r) => setInfo(`${getCategory(r.category)?.label ?? "Melding"}, ${ago(r.created_at)}`)} onMove={setView} />
        {info && (
          <button type="button" className="absolute inset-x-4 bottom-6 z-10 rounded-xl border border-border bg-[rgba(10,13,20,.92)] px-4 py-3 text-left text-[13px]" onClick={() => setInfo(null)}>
            {info}
          </button>
        )}
      </div>
      <aside className="flex flex-col gap-6 overflow-y-auto border-l border-border bg-bg px-5 py-6 lg:w-[400px]">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-cyan">{ROLE_LABEL[me.role]}</p>
            <h1 className="display mt-1 text-[24px]">{me.name}</h1>
          </div>
          <button type="button" className="btn-ghost w-auto! px-2" onClick={onLogout}>
            Uitloggen
          </button>
        </header>

        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Periode">
          {[7, 30, 90].map((d) => (
            <button key={d} type="button" role="radio" aria-checked={days === d} onClick={() => setDays(d)} className={`h-10 rounded-xl border text-[13px] ${days === d ? "border-[rgba(255,170,160,.35)] bg-[rgba(237,58,44,.22)] text-white" : "border-border bg-surface text-muted"}`}>
              {d} dagen
            </button>
          ))}
        </div>

        <section aria-labelledby="h-when">
          <h2 id="h-when" className="text-[15px] font-medium">Wanneer wordt er gemeld</h2>
          <p className="mt-1 text-[12px] text-muted">{data?.reports.length ?? 0} meldingen in {days} dagen, per uur van de dag</p>
          <div className="mt-3 flex h-24 items-end gap-[3px]" role="img" aria-label="Meldingen per uur van de dag">
            {(data?.hours ?? Array(24).fill(0)).map((n, h) => (
              <div key={h} className="flex-1 rounded-t-sm bg-[rgba(237,58,44,.65)]" style={{ height: `${Math.max(2, (n / maxHour) * 100)}%` }} title={`${h}:00, ${n}`} />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted">
            <span>0:00</span>
            <span>6:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:00</span>
          </div>
        </section>

        <section aria-labelledby="h-cat">
          <h2 id="h-cat" className="text-[15px] font-medium">Waarover</h2>
          <ul className="mt-2 flex flex-col">
            {byCat.slice(0, 8).map(([c, n]) => (
              <li key={c} className="flex justify-between border-b border-border py-2 text-[13px]">
                <span>{getCategory(c)?.label ?? c}</span>
                <span className="num text-muted">{n}</span>
              </li>
            ))}
            {byCat.length === 0 && <li className="text-[13px] text-muted">Nog geen meldingen in deze periode.</li>}
          </ul>
          {me.role !== "buurtteam" && hateCount > 0 && <p className="mt-2 text-[12px] text-muted">{hateCount} melders gaven aan dat het om wie ze zijn ging.</p>}
        </section>

        {me.role !== "buurtteam" && (
          <section aria-labelledby="h-sig">
            <h2 id="h-sig" className="text-[15px] font-medium">Signalen van uitbuiting</h2>
            <p className="mt-1 text-[12px] text-muted">Alleen zichtbaar voor politie en moderatie, pas als twee mensen dezelfde plek meldden. Ga zelf na of het klopt.</p>
            <ul className="mt-2 flex flex-col gap-2">
              {(data?.signals ?? []).map((s, i) => (
                <li key={i}>
                  <button type="button" className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-left" onClick={() => fly(s)}>
                    <span className="block text-[14px] font-medium">{s.reporters} melders · {s.reports} meldingen</span>
                    <span className="block text-[12px] text-muted">Laatst {ago(s.last)} · tik om te tonen</span>
                  </button>
                </li>
              ))}
              {data && data.signals.length === 0 && <li className="text-[13px] text-muted">Geen signalen op dit moment.</li>}
            </ul>
          </section>
        )}

        {me.role !== "police" && <Walking view={view} walks={data?.walks ?? []} onChange={load} />}
        {me.role !== "police" && <Hotspots reports={data?.reports ?? []} onFly={fly} />}
        {me.role === "moderator" && <Moderation />}

        <p className="text-[12px] text-muted">Bij nood: bel altijd 112. Je ziet nooit wie er meldde.</p>
      </aside>
    </div>
  );
}

function Walking({ view, walks, onChange }: { view: LatLon; walks: { id: string; team: string }[]; onChange: () => void }) {
  const [hours, setHours] = useState(2);
  const [mine, setMine] = useState<string | null>(null);
  return (
    <section aria-labelledby="h-walk">
      <h2 id="h-walk" className="text-[15px] font-medium">Avondwandeling</h2>
      <p className="mt-1 text-[12px] text-muted">Bewoners zien op de kaart dat jullie hier lopen. Dat geeft rust. De plek is vervaagd tot ±100 m.</p>
      <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Hoe lang">
        {[1, 2, 3].map((h) => (
          <button key={h} type="button" role="radio" aria-checked={hours === h} onClick={() => setHours(h)} className={`h-10 rounded-xl border text-[13px] ${hours === h ? "border-[rgba(56,210,255,.5)] bg-[rgba(56,210,255,.16)] text-white" : "border-border bg-surface text-muted"}`}>
            {h} uur
          </button>
        ))}
      </div>
      <button
        type="button"
        className="btn glass mt-3"
        onClick={async () => {
          const out = await call<{ id: string }>("POST", "/partner/walks", { ...view, hours }).catch(() => null);
          if (out) setMine(out.id);
          onChange();
        }}
      >
        <span>Start wandeling in het midden van de kaart</span>
      </button>
      {walks.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 text-[13px]">
          {walks.map((w) => (
            <li key={w.id} className="flex items-center justify-between border-b border-border py-2">
              <span>{w.team} loopt nu</span>
              {mine === w.id && (
                <button
                  type="button"
                  className="text-[12px] text-red"
                  onClick={async () => {
                    await call("DELETE", `/partner/walks/${w.id}`).catch(() => {});
                    setMine(null);
                    onChange();
                  }}
                >
                  Stop
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Where to walk tonight: the busiest 100 m cells of the last six hours. */
function Hotspots({ reports, onFly }: { reports: PartnerMap["reports"]; onFly: (p: LatLon) => void }) {
  const spots = useMemo(() => {
    const m = new Map<string, { lat: number; lon: number; score: number; n: number }>();
    reports
      .filter((r) => Date.now() - new Date(r.created_at).getTime() < 6 * 3_600_000)
      .forEach((r) => {
        const k = `${r.lat.toFixed(3)},${r.lon.toFixed(3)}`;
        const s = m.get(k) ?? { lat: r.lat, lon: r.lon, score: 0, n: 0 };
        s.score += r.severity;
        s.n++;
        m.set(k, s);
      });
    return [...m.values()].sort((a, b) => b.score - a.score).slice(0, 5);
  }, [reports]);
  return (
    <section aria-labelledby="h-hot">
      <h2 id="h-hot" className="text-[15px] font-medium">Waar lopen vanavond</h2>
      <ul className="mt-2 flex flex-col gap-2">
        {spots.map((s, i) => (
          <li key={i}>
            <button type="button" className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-left text-[13px]" onClick={() => onFly(s)}>
              {s.n} {s.n === 1 ? "melding" : "meldingen"} de laatste zes uur · tik om te tonen
            </button>
          </li>
        ))}
        {spots.length === 0 && <li className="text-[13px] text-muted">Rustig de laatste zes uur.</li>}
      </ul>
    </section>
  );
}

function Moderation() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [invite, setInvite] = useState<string | null>(null);
  const load = () => {
    call<QueueItem[]>("GET", "/partner/queue").then(setQueue).catch(() => {});
    call<Account[]>("GET", "/partner/accounts").then(setAccounts).catch(() => {});
  };
  useEffect(load, []);
  const pending = accounts.filter((a) => a.status === "pending");

  return (
    <>
      <section aria-labelledby="h-queue">
        <h2 id="h-queue" className="text-[15px] font-medium">Te controleren ({queue.length})</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {queue.map((q) => (
            <li key={q.id} className="rounded-xl border border-border bg-surface px-4 py-3 text-[13px]">
              <p className="font-medium">
                {q.label} · {ago(q.created_at)}
              </p>
              {q.note && <p className="mt-1 text-[#cfd3dd]">"{q.note}"</p>}
              <p className="mt-1 text-[12px] text-muted">
                {[q.moderation?.reasons.length ? `Controle: ${q.moderation.reasons.join(", ")}` : null, q.flags ? `${q.flags}x gerapporteerd (${q.flag_reasons})` : null].filter(Boolean).join(" · ") || "Melder had eerder verwijderde meldingen"}
              </p>
              <div className="mt-2 flex gap-2">
                <button type="button" className="btn glass h-10! flex-1" onClick={() => call("POST", `/partner/reports/${q.id}`, { status: "approved" }).then(load)}>
                  <span>Goedkeuren</span>
                </button>
                <button type="button" className="btn glass glass-red h-10! flex-1" onClick={() => call("POST", `/partner/reports/${q.id}`, { status: "removed" }).then(load)}>
                  <span>Verwijderen</span>
                </button>
              </div>
            </li>
          ))}
          {queue.length === 0 && <li className="text-[13px] text-muted">Niets te controleren.</li>}
        </ul>
      </section>

      <section aria-labelledby="h-acc">
        <h2 id="h-acc" className="text-[15px] font-medium">Aanvragen ({pending.length})</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {pending.map((a) => (
            <li key={a.id} className="rounded-xl border border-border bg-surface px-4 py-3 text-[13px]">
              <p className="font-medium">
                {a.name} · {ROLE_LABEL[a.role]}
              </p>
              <p className="text-[12px] text-muted">{a.email}</p>
              <div className="mt-2 flex gap-2">
                <button type="button" className="btn glass h-10! flex-1" onClick={() => call("POST", `/partner/accounts/${a.id}`, { status: "active" }).then(load)}>
                  <span>Goedkeuren</span>
                </button>
                <button type="button" className="btn glass h-10! flex-1" onClick={() => call("POST", `/partner/accounts/${a.id}`, { status: "disabled" }).then(load)}>
                  <span>Afwijzen</span>
                </button>
              </div>
            </li>
          ))}
          {pending.length === 0 && <li className="text-[13px] text-muted">Geen open aanvragen.</li>}
        </ul>
      </section>

      <section aria-labelledby="h-inv">
        <h2 id="h-inv" className="text-[15px] font-medium">Iemand uitnodigen</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["buurtteam", "moderator"] as Role[]).map((r) => (
            <button key={r} type="button" className="btn glass h-11!" onClick={() => call<{ code: string }>("POST", "/partner/invites", { role: r }).then((o) => setInvite(`${ROLE_LABEL[r]}: ${o.code}`))}>
              <span>{ROLE_LABEL[r]}</span>
            </button>
          ))}
        </div>
        {invite && (
          <p className="mt-2 rounded-xl border border-border bg-surface px-4 py-3 text-[14px]" role="status">
            Code <b className="num select-all font-medium">{invite}</b>, 14 dagen geldig.
          </p>
        )}
      </section>
    </>
  );
}
