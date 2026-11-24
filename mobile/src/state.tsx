// App-wide state: reports, location, the report draft, fake calls.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import * as Location from "expo-location";
import type { ReportType } from "@shared/categories";
import { fuzz, inNetherlands, type LatLon } from "@shared/fuzz";
import type { PublicReport } from "@shared/types";
import { DEFAULT_CENTER } from "@shared/geo";
import { API_URL } from "@/city";
import { createStore } from "@/lib/store";
import * as kv from "@/lib/kv";

export interface Draft {
  type: ReportType;
  category: string | null;
  severity: number;
  note: string;
  hate: boolean;
}

export const EMPTY_DRAFT: Draft = { type: "situation", category: null, severity: 50, note: "", hate: false };

export interface Walk {
  id: string;
  team: string;
  lat: number;
  lon: number;
  ends_at: string;
}

interface AppValue {
  store: ReturnType<typeof createStore>;
  reports: PublicReport[];
  walks: Walk[];
  refresh: () => void;
  me: LatLon | null;
  locate: () => Promise<LatLon | null>;
  /** Where the map is looking. */
  view: LatLon;
  setView: (p: LatLon) => void;
  /** Ask the map to fly somewhere. */
  flyTo: { point: LatLon; key: number } | null;
  fly: (p: LatLon) => void;
  draft: Draft;
  setDraft: (fn: (d: Draft) => Draft) => void;
  resetDraft: () => void;
  lastStatus: "approved" | "pending" | "private";
  setLastStatus: (s: "approved" | "pending" | "private") => void;
  /** Where a new report is placed: your position in NL, else the map centre. */
  reportPoint: () => { point: LatLon; source: "device" | "map" };
  onboarded: boolean;
  setOnboarded: () => void;
}

const Ctx = createContext<AppValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const viewRef = useRef<LatLon>(kv.get<LatLon | null>("lastArea", null) ?? DEFAULT_CENTER);
  const store = useMemo(() => createStore(() => viewRef.current), []);
  const [reports, setReports] = useState<PublicReport[]>([]);
  const [walks, setWalks] = useState<Walk[]>([]);
  const [me, setMe] = useState<LatLon | null>(null);
  const [view, setViewState] = useState<LatLon>(viewRef.current);
  const [flyTo, setFlyTo] = useState<AppValue["flyTo"]>(null);
  const [draft, setDraftState] = useState<Draft>(EMPTY_DRAFT);
  const [lastStatus, setLastStatus] = useState<AppValue["lastStatus"]>("approved");
  const [onboarded, setOnboardedState] = useState(kv.get("onboarded", false));

  const refresh = useCallback(() => {
    store.list().then(setReports).catch(() => {});
    if (API_URL)
      fetch(`${API_URL}/walks`)
        .then((r) => (r.ok ? r.json() : []))
        .then(setWalks)
        .catch(() => {});
  }, [store]);

  useEffect(() => {
    refresh();
    const off = store.subscribe(refresh);
    const sub = AppState.addEventListener("change", (s) => s === "active" && refresh());
    return () => {
      off();
      sub.remove();
    };
  }, [store, refresh]);

  const locate = useCallback(async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) return null;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const p = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      setMe(p);
      // Only a blurred area is ever kept on the phone.
      kv.set("lastArea", fuzz(p, 500));
      return p;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    // Already allowed: find the position quietly.
    Location.getForegroundPermissionsAsync()
      .then((p) => {
        if (p.granted) void locate();
      })
      .catch(() => {});
  }, [locate]);

  const value: AppValue = {
    store,
    reports,
    walks,
    refresh,
    me,
    locate,
    view,
    setView: (p) => {
      viewRef.current = p;
      setViewState(p);
    },
    flyTo,
    fly: (point) => setFlyTo({ point, key: Date.now() }),
    draft,
    setDraft: (fn) => setDraftState((d) => fn(d)),
    resetDraft: () => setDraftState(EMPTY_DRAFT),
    lastStatus,
    setLastStatus,
    reportPoint: () => (me && inNetherlands(me) ? { point: me, source: "device" } : { point: viewRef.current, source: "map" }),
    onboarded,
    setOnboarded: () => {
      kv.set("onboarded", true);
      setOnboardedState(true);
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside AppProvider");
  return v;
}
