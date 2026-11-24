// Report categories. They describe behaviour and places, never who a person is.
// A person who seems to need help is a welfare signal, not a threat.

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
  icon: IconName;
}

export const CATEGORIES: Category[] = [
  { id: "drugsgebruik", type: "situation", label: "Drugsgebruik", ttlMinutes: 180, icon: "pill" },
  { id: "overlast", type: "situation", label: "Overlast", ttlMinutes: 120, icon: "volume" },
  { id: "inbraakpoging", type: "situation", label: "Inbraakpoging", ttlMinutes: 720, icon: "door" },
  { id: "iemand-in-nood", type: "situation", label: "Iemand in nood", welfare: true, ttlMinutes: 60, icon: "hand" },
  { id: "onveilig-gevoel", type: "situation", label: "Onveilig gevoel", ttlMinutes: 240, icon: "eye" },
  { id: "donkere-plek", type: "situation", label: "Donkere plek", ttlMinutes: 4320, icon: "lamp", forward: "city" },
  { id: "rook-of-alarm", type: "situation", label: "Rook of alarm", ttlMinutes: 60, icon: "flame", urgent: true },

  { id: "nageroepen", type: "incident", label: "Nageroepen", ttlMinutes: 240, icon: "megaphone" },
  { id: "gevolgd", type: "incident", label: "Gevolgd", ttlMinutes: 360, icon: "footsteps" },
  { id: "bedreigd", type: "incident", label: "Bedreigd", ttlMinutes: 720, icon: "alert" },
  { id: "bestolen", type: "incident", label: "Bestolen", ttlMinutes: 1440, icon: "bag" },
  { id: "aangevallen", type: "incident", label: "Aangevallen", ttlMinutes: 1440, icon: "shield" },
];

export const TYPE_LABEL: Record<ReportType, string> = {
  situation: "Ik zie iets",
  incident: "Overkomt mij",
};

export function categoriesFor(type: ReportType): Category[] {
  return CATEGORIES.filter((c) => c.type === type);
}

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
