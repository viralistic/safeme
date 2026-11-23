import { useEffect, useRef, useState } from "react";
import Icon from "../Icon";
import { lookupPlace, searchPlaces, type Place } from "@/lib/geo";
import type { LatLon } from "@/lib/fuzz";

interface Props {
  demo: boolean;
  count: number;
  onReport: () => void;
  onLocate: () => void;
  onPlace: (p: LatLon) => void;
}

export default function KaartOverlay({ demo, count, onReport, onLocate, onPlace }: Props) {
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searching) input.current?.focus();
  }, [searching]);

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => searchPlaces(q, ctrl.signal).then(setResults).catch(() => {}), 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  async function pick(p: Place) {
    const pt = await lookupPlace(p.id);
    setSearching(false);
    setQ("");
    if (pt) onPlace(pt);
  }

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 px-5 pt-[calc(env(safe-area-inset-top)+14px)]">
        {searching ? (
          <div className="pointer-events-auto flex h-11 flex-1 items-center gap-2 rounded-full border border-border bg-[rgba(10,13,20,.85)] pl-4 pr-1 backdrop-blur-md">
            <Icon name="search" size={17} className="text-muted" />
            <label className="sr-only" htmlFor="place">Zoek een plek</label>
            <input
              id="place"
              ref={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setSearching(false)}
              placeholder="Buurt, straat of postcode"
              autoComplete="off"
              className="h-full flex-1 bg-transparent text-[14px] text-fg placeholder:text-muted focus:outline-none"
            />
            <button type="button" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-fg" onClick={() => setSearching(false)} aria-label="Zoeken sluiten">
              <Icon name="close" size={16} />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <img src="/icons/icon-160.png" alt="Safety Map" width={40} height={40} className="rounded-xl" />
              {demo && (
                <span className="rounded-full border border-border bg-[rgba(10,13,20,.7)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.14em] text-cyan backdrop-blur">
                  Demo
                </span>
              )}
            </div>
            <div className="pointer-events-auto flex gap-2">
              <button type="button" className="chip" onClick={onLocate} aria-label="Naar mijn locatie">
                <Icon name="locate" size={17} />
              </button>
              <button type="button" className="chip" onClick={() => setSearching(true)} aria-label="Zoek een plek">
                <Icon name="search" size={17} />
              </button>
            </div>
          </>
        )}
      </div>
      {searching && results.length > 0 && (
        <ul className="absolute inset-x-5 top-[calc(env(safe-area-inset-top)+66px)] z-10 overflow-hidden rounded-2xl border border-border bg-[rgba(10,13,20,.92)] backdrop-blur-md" role="listbox" aria-label="Zoekresultaten">
          {results.map((r) => (
            <li key={r.id}>
              <button type="button" className="w-full border-t border-border px-4 py-3 text-left text-[14px] first:border-t-0 hover:bg-surface2" onClick={() => pick(r)}>
                {r.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="pointer-events-none absolute left-5 top-[calc(env(safe-area-inset-top)+66px)] z-[9] flex flex-col gap-2">
        <div className="flex items-center gap-3 rounded-full border border-border bg-[rgba(10,13,20,.72)] px-3 py-1.5 text-[10px] font-medium text-muted backdrop-blur" aria-label="Legenda">
          <span className="flex items-center gap-1.5"><i className="block h-2 w-2 rounded-full bg-powder" />Laag</span>
          <span className="flex items-center gap-1.5"><i className="block h-2.5 w-2.5 rounded-full bg-oxblood" />Midden</span>
          <span className="flex items-center gap-1.5"><i className="block h-3 w-3 rounded-full bg-red" />Hoog</span>
          <span className="flex items-center gap-1.5"><i className="block h-2.5 w-2.5 rounded-full border-2 border-cyan" />Hulp</span>
        </div>
        <p className="sr-only" aria-live="polite">{count} actieve meldingen in beeld</p>
      </div>

      <button type="button" className="fab glass glass-red bottom-[90px] z-10" onClick={onReport}>
        <Icon name="plus" size={17} />
        <span>Melden</span>
      </button>
    </>
  );
}
