import type { ReactNode } from "react";
import Icon from "./Icon";
import { t } from "@/lib/i18n";

export function Note112({ className = "" }: { className?: string }) {
  return (
    <p className={`text-center text-[11px] text-muted ${className}`}>
      {t("Bij nood: bel altijd")} <b className="font-semibold text-fg">112</b>
    </p>
  );
}

export function Header({ title, onBack, onClose, children }: { title: ReactNode; onBack?: () => void; onClose?: () => void; children?: ReactNode }) {
  return (
    <div className="relative z-10 flex items-start justify-between gap-3 px-[22px] pt-4 pb-1">
      <div className="flex items-start gap-3">
        {onBack && (
          <button type="button" className="chip -ml-1 shrink-0" onClick={onBack} aria-label={t("Terug")}>
            <Icon name="back" size={18} />
          </button>
        )}
        <h1 className="display text-[28px] pt-1">{title}</h1>
      </div>
      {onClose && (
        <button type="button" className="chip shrink-0" onClick={onClose} aria-label={t("Sluiten")}>
          <Icon name="close" size={18} />
        </button>
      )}
      {children}
    </div>
  );
}

export type Tab = "kaart" | "meldingen" | "jij";

export function BottomNav({ active, go }: { active: Tab; go: (t: Tab) => void }) {
  const items: { id: Tab; icon: "map" | "bell" | "user"; label: string }[] = [
    { id: "kaart", icon: "map", label: t("Kaart") },
    { id: "meldingen", icon: "bell", label: t("Meldingen") },
    { id: "jij", icon: "user", label: t("Jij") },
  ];
  return (
    <nav className="relative z-10 flex shrink-0 items-center justify-around border-t border-border bg-[rgba(7,10,17,.72)] pt-2 pb-3 backdrop-blur-md" aria-label={t("Hoofdmenu")}>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => go(it.id)}
          aria-current={active === it.id ? "page" : undefined}
          className={`flex min-w-16 flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-medium tracking-wide ${active === it.id ? "text-red" : "text-muted hover:text-fg"}`}
        >
          <Icon name={it.icon} size={21} />
          {it.label}
        </button>
      ))}
    </nav>
  );
}
