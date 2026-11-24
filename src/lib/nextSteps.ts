// Where to go next after a report. Safety Map does not replace the police or
// victim support; it points people to the right door.

export interface NextStep {
  label: string;
  href: string;
  detail: string;
}

const POLICE_REPORT: NextStep = { label: "Aangifte of melding bij de politie", href: "https://www.politie.nl/aangifte-of-melding-doen", detail: "Geen spoed: 0900 8844" };
const ANONYMOUS: NextStep = { label: "Meld Misdaad Anoniem", href: "https://www.meldmisdaadanoniem.nl", detail: "Anoniem een tip geven: 0800 7000" };
const VICTIM: NextStep = { label: "Slachtofferhulp", href: "https://www.slachtofferhulp.nl", detail: "Gratis steun na wat je meemaakte" };
const SEXUAL: NextStep = { label: "Centrum Seksueel Geweld", href: "https://centrumseksueelgeweld.nl", detail: "Dag en nacht: 0800 0188" };
const DISCRIMINATION: NextStep = { label: "Ging het om wie je bent?", href: "https://www.discriminatie.nl", detail: "Meld discriminatie" };

const BY_CATEGORY: Record<string, NextStep[]> = {
  drugsgebruik: [ANONYMOUS],
  overlast: [POLICE_REPORT],
  inbraakpoging: [ANONYMOUS, POLICE_REPORT],
  "iemand-in-nood": [],
  "onveilig-gevoel": [],
  nageroepen: [DISCRIMINATION, SEXUAL],
  gevolgd: [POLICE_REPORT, VICTIM],
  bedreigd: [POLICE_REPORT, VICTIM, DISCRIMINATION],
  bestolen: [POLICE_REPORT, VICTIM],
  aangevallen: [POLICE_REPORT, VICTIM, SEXUAL, DISCRIMINATION],
};

export function nextSteps(category: string): NextStep[] {
  return BY_CATEGORY[category] ?? [];
}
