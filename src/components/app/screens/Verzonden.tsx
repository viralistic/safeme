import { useEffect, useRef } from "react";
import { getCategory } from "@/lib/categories";
import Icon from "../Icon";
import { ASSETS } from "@/lib/assets";
import { nextSteps } from "@/lib/nextSteps";

interface Props {
  status: "approved" | "pending" | "private";
  category: string;
  onDone: () => void;
}

export default function Verzonden({ status, category, onDone }: Props) {
  const cat = getCategory(category);
  const hours = cat ? Math.round(cat.ttlMinutes / 60) : 0;
  const steps = nextSteps(category);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current?.focus(), []);

  return (
    <section className="screen bg-cover! bg-center!" style={{ backgroundImage: `url(${ASSETS.calm})` }} aria-labelledby="sent-title">
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(7,10,17,.9),rgba(7,10,17,.3)_60%,rgba(7,10,17,.5))]" />
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-7 py-6 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-white/40 text-white">
          <Icon name="check" size={30} stroke={2.4} />
        </span>
        <h1 id="sent-title" ref={title} tabIndex={-1} className="display text-[28px] text-white outline-none">
          {status === "approved" ? (
            <>Gedaan. De buurt<br />ziet jouw melding</>
          ) : status === "private" ? (
            <>Gedaan. Alleen de<br />politie ziet dit</>
          ) : (
            <>Gedaan. We kijken<br />even mee</>
          )}
        </h1>
        <p className="max-w-[240px] text-[13px] leading-normal text-[#cfd3dd]">
          {status === "approved"
            ? `Hij staat nu live en vervaagt vanzelf over ${hours === 1 ? "een uur" : `${hours} uur`}. Bij nood bel 112.`
            : status === "private"
              ? "Je melding staat niet op de openbare kaart. Meldt nog iemand deze plek, dan ziet de politie het. Bij nood bel 112."
              : "Je melding wordt kort gecontroleerd en verschijnt daarna op de kaart. Bij nood bel 112."}
        </p>
        {steps.length > 0 && (
          <div className="mt-2 flex w-full max-w-[320px] flex-col gap-2 text-left">
            <p className="eyebrow text-center text-muted">Volgende stap, als je wilt</p>
            {steps.map((st) => (
              <a key={st.href} href={st.href} target="_blank" rel="noopener" className="glass rounded-xl px-4 py-3">
                <span className="block text-[14px] font-medium">{st.label}</span>
                <span className="block text-[12px] text-[#cfd3dd]">{st.detail}</span>
              </a>
            ))}
          </div>
        )}
      </div>
      <div className="relative z-10 px-6 pb-6">
        <button type="button" className="btn glass glass-red" onClick={onDone}>
          <span>Terug naar kaart</span>
        </button>
      </div>
    </section>
  );
}
