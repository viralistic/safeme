// Public monthly summary: counts only, never single reports or places.
import { useEffect, useState } from "react";
import { getCategory } from "@/lib/categories";
import { CITY } from "@/lib/city";
import { locale, t } from "@/lib/i18n";
import { API_URL } from "@/lib/store";

interface Data {
  month: string;
  total: number;
  previous: number;
  removedShare: number;
  confirmations: number;
  darkSpots: number;
  privateSignals: number;
  byCategory: { category: string; n: number }[];
  hours: number[];
}

function shift(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default function Summary() {
  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(current);
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    fetch(`${API_URL.replace(/\/$/, "")}/summary?month=${month}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setFailed(true));
  }, [month]);

  const label = new Date(`${month}-01T12:00:00`).toLocaleDateString(locale, { month: "long", year: "numeric" });
  const maxCat = Math.max(1, ...(data?.byCategory.map((c) => c.n) ?? [1]));
  const maxHour = Math.max(1, ...(data?.hours ?? [1]));
  const change = data && data.previous ? Math.round(((data.total - data.previous) / data.previous) * 100) : null;

  return (
    <main className="mx-auto flex max-w-[860px] flex-col gap-10 px-5 py-12">
      <header className="flex flex-col gap-3">
        <a href="/" className="flex items-center gap-3 text-[14px] text-muted">
          <img src="/icons/icon-160.png" alt="" width={28} height={28} className="rounded-lg" />
          Safety Map
        </a>
        <h1 className="display text-[clamp(28px,5vw,42px)]">{t("Cijfers per maand in {city}", { city: CITY.name })}</h1>
        <p className="max-w-[60ch] text-[15px] leading-relaxed text-[#cfd3dd]">
          {t("Alleen aantallen, nooit losse meldingen of plekken. Zo zie je of het rustiger wordt, zonder dat iemand herkenbaar is.")}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <button type="button" className="chip" aria-label={t("Vorige maand")} onClick={() => setMonth(shift(month, -1))}>
            ‹
          </button>
          <span className="min-w-40 text-center text-[16px] font-medium capitalize">{label}</span>
          <button type="button" className="chip" aria-label={t("Volgende maand")} onClick={() => setMonth(shift(month, 1))} disabled={month >= current}>
            ›
          </button>
        </div>
      </header>

      {failed && <p className="text-[14px] text-muted">{t("De cijfers zijn nu niet te laden.")}</p>}

      {data && (
        <>
          <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4" aria-label={t("Kerncijfers")}>
            {[
              [data.total, t("meldingen op de kaart"), change === null ? "" : change === 0 ? t("gelijk aan vorige maand") : change > 0 ? t("{n}% meer dan vorige maand", { n: change }) : t("{n}% minder dan vorige maand", { n: -change })],
              [data.confirmations, t("keer herkend door anderen"), ""],
              [data.darkSpots, t("donkere plekken gemeld"), t("doorgegeven aan de gemeente")],
              [`${Math.round(data.removedShare * 100)}%`, t("verwijderd door moderatie"), ""],
            ].map(([n, l, sub], i) => (
              <div key={i} className="flex flex-col gap-1 bg-page p-5">
                <b className="num text-[28px] font-medium">{n}</b>
                <span className="text-[13px] text-[#cfd3dd]">{l}</span>
                {sub && <span className="text-[12px] text-muted">{sub}</span>}
              </div>
            ))}
          </section>

          <section aria-labelledby="h-cat" className="flex flex-col gap-3">
            <h2 id="h-cat" className="text-[18px] font-medium">{t("Waarover")}</h2>
            {data.byCategory.length === 0 && <p className="text-[14px] text-muted">{t("Geen meldingen in deze maand.")}</p>}
            <ul className="flex flex-col gap-2">
              {data.byCategory.map((c) => (
                <li key={c.category} className="grid grid-cols-[160px_1fr_48px] items-center gap-3 text-[14px]">
                  <span className="truncate">{getCategory(c.category)?.label ?? c.category}</span>
                  <span className="h-3 rounded-full bg-[rgba(237,58,44,.7)]" style={{ width: `${(c.n / maxCat) * 100}%` }} />
                  <span className="num text-right text-muted">{c.n}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="h-hour" className="flex flex-col gap-3">
            <h2 id="h-hour" className="text-[18px] font-medium">{t("Per uur van de dag")}</h2>
            <div className="flex h-32 items-end gap-1" role="img" aria-label={t("Meldingen per uur van de dag")}>
              {data.hours.map((n, h) => (
                <div key={h} className="flex-1 rounded-t-sm bg-[rgba(56,210,255,.55)]" style={{ height: `${Math.max(2, (n / maxHour) * 100)}%` }} title={`${h}:00 ${n}`} />
              ))}
            </div>
            <div className="flex justify-between text-[11px] text-muted">
              <span>0:00</span>
              <span>6:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:00</span>
            </div>
          </section>

          {data.privateSignals > 0 && (
            <p className="text-[13px] text-muted">{t("Daarnaast kwamen er {n} signalen van uitbuiting binnen. Die staan nooit op de openbare kaart.", { n: data.privateSignals })}</p>
          )}
        </>
      )}

      <section aria-labelledby="h-off" className="flex flex-col gap-2 border-t border-border pt-8">
        <h2 id="h-off" className="text-[18px] font-medium">{t("Officiële cijfers")}</h2>
        <p className="text-[14px] text-muted">{t("Safety Map laat zien hoe mensen zich voelen. Voor misdaadcijfers kijk je bij de officiële bronnen.")}</p>
        <a className="text-[14px] text-cyan underline" href={CITY.statsUrl} target="_blank" rel="noopener">
          {t("Veiligheid in cijfers van de gemeente")}
        </a>
        <a className="text-[14px] text-cyan underline" href="https://www.cbs.nl/nl-nl/reeksen/veiligheidsmonitor" target="_blank" rel="noopener">
          {t("CBS Veiligheidsmonitor")}
        </a>
      </section>
      <p className="text-[12px] text-muted">{t("Bij nood: bel altijd")} 112</p>
    </main>
  );
}
