import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { categoriesFor, TYPE_LABEL, type ReportType } from "@/lib/categories";
import { Header } from "../ui";
import { t } from "@/lib/i18n";

interface Props {
  type: ReportType;
  category: string | null;
  onType: (t: ReportType) => void;
  onNext: (category: string) => void;
  onClose: () => void;
}

const ITEM_H = 68;

export default function MeldenCategorie({ type, category, onType, onNext, onClose }: Props) {
  const items = categoriesFor(type);
  const startIndex = Math.max(0, items.findIndex((c) => c.id === category));
  const [index, setIndex] = useState(category ? startIndex : Math.min(2, items.length - 1));
  const list = useRef<HTMLDivElement>(null);
  const settling = useRef(false);

  // Center the selected item whenever the tab changes.
  useLayoutEffect(() => {
    const i = category && items.some((c) => c.id === category) ? startIndex : Math.min(2, items.length - 1);
    setIndex(i);
    scrollTo(i, false);
  }, [type]);

  function scrollTo(i: number, smooth = true) {
    const el = list.current;
    if (!el) return;
    settling.current = smooth;
    el.scrollTo({ top: i * ITEM_H, behavior: smooth ? "smooth" : "auto" });
  }

  function onScroll() {
    const el = list.current;
    if (!el) return;
    const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM_H)));
    if (i !== index) setIndex(i);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const i = Math.max(0, Math.min(items.length - 1, index + (e.key === "ArrowDown" ? 1 : -1)));
      setIndex(i);
      scrollTo(i);
    } else if (e.key === "Enter") onNext(items[index].id);
  }

  const [pad, setPad] = useState(140);
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setPad(Math.max(0, el.clientHeight / 2 - ITEM_H / 2)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Padding changes move the items, so re-center the current one.
  useLayoutEffect(() => scrollTo(index, false), [pad]);

  const selected = items[index];

  return (
    <section className="screen" aria-labelledby="cat-title">
      <Header title={<span id="cat-title">{type === "situation" ? t("Wat zie je?") : t("Wat overkomt je?")}</span>} onClose={onClose} />
      <div className="px-[22px] pt-4">
        <div className="mb-4 flex gap-7" role="tablist" aria-label={t("Soort melding")}>
          {(["situation", "incident"] as ReportType[]).map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={type === t}
              onClick={() => onType(t)}
              className={`border-b-2 pb-2.5 text-[14px] font-semibold ${type === t ? "border-red text-fg" : "border-transparent text-muted hover:text-fg"}`}
            >
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>
      <div className="wheel">
        <div
          ref={list}
          className="wheel-list"
          role="listbox"
          tabIndex={0}
          aria-label={t("Categorie")}
          aria-activedescendant={`cat-${selected.id}`}
          onScroll={onScroll}
          onKeyDown={onKey}
          style={{ paddingTop: pad, paddingBottom: pad }}
        >
          {items.map((c, i) => (
            <button
              key={c.id}
              id={`cat-${c.id}`}
              type="button"
              role="option"
              aria-selected={i === index}
              tabIndex={-1}
              className={`wheel-item ${i === index ? "sel" : ""}`}
              onClick={() => (i === index ? onNext(c.id) : (setIndex(i), scrollTo(i)))}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="wheel-band" />
      </div>
      <div className="px-[22px] pt-3 pb-5">
        {selected.welfare && (
          <p className="mb-3 text-center text-[12px] leading-snug text-cyan">{t("Dit is een hulpsignaal, geen waarschuwing. Twijfel je? Bel 112.")}</p>
        )}
        <button type="button" className="btn glass glass-red" onClick={() => onNext(selected.id)}>
          <span>{t("Verder")}</span>
        </button>
      </div>
    </section>
  );
}
