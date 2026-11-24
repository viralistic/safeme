// Where to go next after a report. Safety Map does not replace the police or
// victim support; it points people to the right door.

import { t } from "./i18n";
import { CITY } from "./city";

export interface NextStep {
  label: string;
  href: string;
  detail: string;
}

const POLICE_REPORT: NextStep = { label: t("Aangifte of melding bij de politie"), href: "https://www.politie.nl/aangifte-of-melding-doen", detail: t("Geen spoed: 0900 8844") };
const ANONYMOUS: NextStep = { label: t("Meld Misdaad Anoniem"), href: "https://www.meldmisdaadanoniem.nl", detail: t("Anoniem een tip geven: 0800 7000") };
const VICTIM: NextStep = { label: t("Slachtofferhulp"), href: "https://www.slachtofferhulp.nl", detail: t("Gratis steun na wat je meemaakte") };
const SEXUAL: NextStep = { label: t("Centrum Seksueel Geweld"), href: "https://centrumseksueelgeweld.nl", detail: t("Dag en nacht: 0800 0188") };
const DISCRIMINATION: NextStep = { label: t("Ging het om wie je bent?"), href: "https://www.discriminatie.nl", detail: t("Meld discriminatie") };

const BY_CATEGORY: Record<string, NextStep[]> = {
  drugsgebruik: [ANONYMOUS],
  overlast: [POLICE_REPORT],
  inbraakpoging: [ANONYMOUS, POLICE_REPORT],
  "iemand-in-nood": [],
  "onveilig-gevoel": [],
  "donkere-plek": [{ label: t("Ook melden bij de gemeente"), href: CITY.reportUrl, detail: t("Kapotte lamp of donkere plek in de openbare ruimte") }],
  "rook-of-alarm": [],
  explosie: [
    { label: t("Slachtofferhulp"), href: "https://www.slachtofferhulp.nl", detail: t("Ook steun voor buren na een explosie") },
    { label: t("Meld Misdaad Anoniem"), href: "https://www.meldmisdaadanoniem.nl", detail: t("Weet je wie erachter zit? Tip anoniem: 0800 7000") },
  ],
  uitbuiting: [{ label: t("Meld Misdaad Anoniem"), href: "https://www.meldmisdaadanoniem.nl", detail: t("Ook voor tips over mensenhandel: 0800 7000") }],
  nageroepen: [DISCRIMINATION, SEXUAL],
  gevolgd: [POLICE_REPORT, VICTIM],
  bedreigd: [POLICE_REPORT, VICTIM, DISCRIMINATION],
  bestolen: [POLICE_REPORT, VICTIM],
  aangevallen: [POLICE_REPORT, VICTIM, SEXUAL, DISCRIMINATION],
};

export function nextSteps(category: string): NextStep[] {
  return BY_CATEGORY[category] ?? [];
}
