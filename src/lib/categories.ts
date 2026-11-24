// Report categories. They describe behaviour and places, never who a person is.
// A person who seems to need help is a welfare signal, not a threat.

import { t } from "./i18n.ts";

export type ReportType = "situation" | "incident";

export type IconName =
  | "pill"
  | "volume"
  | "door"
  | "hand"
  | "eye"
  | "megaphone"
  | "footsteps"
  | "alert"
  | "bag"
  | "shield"
  | "lamp"
  | "flame";

export interface Category {
  id: string;
  type: ReportType;
  label: string;
  /** Welfare signals are shown in cyan and never feed the danger heat map. */
  welfare?: boolean;
  /** How long a report stays on the map, in minutes. */
  ttlMinutes: number;
  /** Urgent: the 112 screen comes first, whatever the severity. */
  urgent?: boolean;
  /** Also passed on to the city's public space reporting. */
  forward?: "city";
  /** Never on the public map. Police see it once two people report the same place. */
  private?: boolean;
  icon: IconName;
}

export const CATEGORIES: Category[] = [
  { id: "drugsgebruik", type: "situation", label: t("Drugsgebruik"), ttlMinutes: 180, icon: "pill" },
  { id: "overlast", type: "situation", label: t("Overlast"), ttlMinutes: 120, icon: "volume" },
  { id: "inbraakpoging", type: "situation", label: t("Inbraakpoging"), ttlMinutes: 720, icon: "door" },
  { id: "iemand-in-nood", type: "situation", label: t("Iemand in nood"), welfare: true, ttlMinutes: 60, icon: "hand" },
  { id: "onveilig-gevoel", type: "situation", label: t("Onveilig gevoel"), ttlMinutes: 240, icon: "eye" },
  { id: "donkere-plek", type: "situation", label: t("Donkere plek"), ttlMinutes: 4320, icon: "lamp", forward: "city" },
  { id: "rook-of-alarm", type: "situation", label: t("Rook of alarm"), ttlMinutes: 60, icon: "flame", urgent: true },
  { id: "explosie", type: "situation", label: t("Explosie of knal"), ttlMinutes: 1440, icon: "alert", urgent: true },
  { id: "uitbuiting", type: "situation", label: t("Uitbuiting"), ttlMinutes: 10080, icon: "eye", private: true },

  { id: "nageroepen", type: "incident", label: t("Nageroepen"), ttlMinutes: 240, icon: "megaphone" },
  { id: "gevolgd", type: "incident", label: t("Gevolgd"), ttlMinutes: 360, icon: "footsteps" },
  { id: "bedreigd", type: "incident", label: t("Bedreigd"), ttlMinutes: 720, icon: "alert" },
  { id: "bestolen", type: "incident", label: t("Bestolen"), ttlMinutes: 1440, icon: "bag" },
  { id: "aangevallen", type: "incident", label: t("Aangevallen"), ttlMinutes: 1440, icon: "shield" },
];

export const TYPE_LABEL: Record<ReportType, string> = {
  situation: t("Ik zie iets"),
  incident: t("Overkomt mij"),
};

export function categoriesFor(type: ReportType): Category[] {
  return CATEGORIES.filter((c) => c.type === type);
}

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
