import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapView from "./MapView";
import KaartOverlay from "./screens/Kaart";
import Start from "./screens/Start";
import MeldenCategorie from "./screens/MeldenCategorie";
import MeldenErnst from "./screens/MeldenErnst";
import Verzonden from "./screens/Verzonden";
import Detail from "./screens/Detail";
import Meldingen from "./screens/Meldingen";
import Jij from "./screens/Jij";
import { BottomNav, type Tab } from "./ui";
import { createStore } from "@/lib/store";
import { fuzz, inNetherlands, type LatLon } from "@/lib/fuzz";
import { areaName, DEFAULT_CENTER, getDevicePosition, lastArea, rememberArea, type LocationSource } from "@/lib/geo";
import { clearLocal, loadPrefs, savePrefs, type AlertPrefs } from "@/lib/prefs";
import { disablePush, enablePush } from "@/lib/push";
import { ERROR_COPY, type PublicReport } from "@/lib/types";
import type { ReportType } from "@/lib/categories";

type Route =
  | { name: "start" }
  | { name: "kaart" }
  | { name: "melden" }
  | { name: "ernst" }
  | { name: "verzonden" }
  | { name: "detail"; id: string }
  | { name: "meldingen" }
  | { name: "jij" };

const ONBOARDED = "sm.onboarded";

function parse(hash: string): Route {
  const [, a, b] = hash.replace(/^#/, "").split("/");
  switch (a) {
    case "start":
    case "melden":
    case "ernst":
    case "verzonden":
    case "meldingen":
    case "jij":
      return { name: a };
    case "melding":
      return b ? { name: "detail", id: b } : { name: "kaart" };
    default:
      return { name: "kaart" };
  }
}

function hashOf(r: Route): string {
  return r.name === "detail" ? `#/melding/${r.id}` : `#/${r.name}`;
}

function onboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDED) === "1";
  } catch {
    return false;
  }
}

interface Draft {
  type: ReportType;
  category: string | null;
  severity: number;
  note: string;
}

const EMPTY_DRAFT: Draft = { type: "situation", category: null, severity: 50, note: "" };

export default function App() {
  const [route, setRoute] = useState<Route>(() => (onboarded() ? parse(location.hash) : { name: "start" }));
  const centerRef = useRef<LatLon>(lastArea() ?? DEFAULT_CENTER);
  const [center, setCenter] = useState<LatLon>(centerRef.current);
  const [flyKey, setFlyKey] = useState(0);
  const [me, setMe] = useState<LatLon | null>(null);
  const store = useMemo(() => createStore(() => centerRef.current), []);
  const [reports, setReports] = useState<PublicReport[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [submit, setSubmit] = useState<{ busy: boolean; error: string | null; status: "approved" | "pending" }>({ busy: false, error: null, status: "approved" });
  const [locating, setLocating] = useState(false);
  const [prefs, setPrefs] = useState<AlertPrefs>(loadPrefs);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const go = useCallback((r: Route, replace = false) => {
    const h = hashOf(r);
    try {
      if (replace) history.replaceState(null, "", h);
      else if (location.hash !== h) history.pushState(null, "", h);
    } catch {
      // Sandboxed frames may refuse history changes. In-memory routing still works.
    }
    setRoute(r);
  }, []);

  useEffect(() => {
    const onPop = () => setRoute(onboarded() ? parse(location.hash) : { name: "start" });
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const refresh = useCallback(() => {
    store
      .list()
      .then(setReports)
      .catch(() => {});
  }, [store]);

  useEffect(() => {
    refresh();
    const off = store.subscribe(refresh);
    // Re-render every minute so ages and expiry stay honest.
    const t = setInterval(() => {
      setTick((n) => n + 1);
      refresh();
    }, 60_000);
    return () => {
      off();
      clearInterval(t);
    };
  }, [store, refresh]);

  useEffect(() => {
    if ("serviceWorker" in navigator && import.meta.env.PROD && !import.meta.env.PUBLIC_SINGLE_FILE) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    if (!onboarded()) return;
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((p) => {
          if (p.state === "granted") void locate(false);
        })
        .catch(() => {});
    }
  }, []);

  async function locate(fly = true): Promise<LatLon | null> {
    setLocating(true);
    const p = await getDevicePosition();
    setLocating(false);
    if (!p) return null;
    setMe(p);
    rememberArea(p);
    if (fly) {
      centerRef.current = p;
      setCenter(p);
      setFlyKey((k) => k + 1);
    }
    return p;
  }

  function finishOnboarding() {
    try {
      localStorage.setItem(ONBOARDED, "1");
    } catch {}
    go({ name: "kaart" }, true);
  }

  function updatePrefs(next: AlertPrefs) {
    setPrefs(next);
    savePrefs(next);
  }

  const reportLocation: { point: LatLon; source: LocationSource } = me && inNetherlands(me) ? { point: me, source: "device" } : { point: center, source: "map" };

  async function placeReport() {
    if (!draft.category) return go({ name: "melden" });
    setSubmit({ busy: true, error: null, status: "approved" });
    // Pre-fuzz on the device so a precise point never leaves it. The server fuzzes again.
    const point = fuzz(reportLocation.point, 50);
    const res = await store.submit({ type: draft.type, category: draft.category, severity: draft.severity, note: draft.note.trim() || undefined, ...point });
    if (!res.ok) return setSubmit({ busy: false, error: ERROR_COPY[res.error], status: "approved" });
    setSubmit({ busy: false, error: null, status: res.status });
    refresh();
    go({ name: "verzonden" }, true);
  }

  const tab: Tab | null = route.name === "kaart" ? "kaart" : route.name === "meldingen" ? "meldingen" : route.name === "jij" ? "jij" : null;
  const selected = route.name === "detail" ? reports.find((r) => r.id === route.id) ?? null : null;

  return (
    <div className="app-root">
      <div className="app-frame">
        <div className="absolute inset-0 flex flex-col">
          <div className="relative flex-1">
            <MapView
              reports={reports}
              center={center}
              flyKey={flyKey}
              me={me}
              onSelect={(r) => go({ name: "detail", id: r.id })}
              onMove={(c) => (centerRef.current = c)}
            />
            {route.name === "kaart" && (
              <KaartOverlay
                count={reports.length}
                onReport={() => {
                  setDraft(EMPTY_DRAFT);
                  setSubmit({ busy: false, error: null, status: "approved" });
                  go({ name: "melden" });
                }}
                onLocate={() => locate(true)}
                onPlace={(p) => {
                  centerRef.current = p;
                  setCenter(p);
                  setFlyKey((k) => k + 1);
                }}
              />
            )}
            {route.name === "meldingen" && (
                <Meldingen
                  prefs={prefs}
                  busy={pushBusy}
                  status={pushStatus}
                  onPush={async (on) => {
                    setPushBusy(true);
                    setPushStatus(null);
                    let area = prefs.area;
                    let name = prefs.areaName;
                    if (on && !area) {
                      area = fuzz(centerRef.current, 500);
                      name = (await areaName(area)) ?? "Kaartgebied";
                    }
                    const next = { ...prefs, area, areaName: name, push: on };
                    if (on) {
                      const state = await enablePush(next);
                      if (state === "denied") {
                        setPushStatus("Meldingen staan uit in je browser. Zet ze aan in de instellingen.");
                        next.push = false;
                      } else if (state === "unsupported") next.push = false;
                      else if (state === "no-backend") setPushStatus("Opgeslagen op dit toestel. Pushmeldingen werken zodra de app live is.");
                    } else await disablePush().catch(() => {});
                    updatePrefs(next);
                    setPushBusy(false);
                  }}
                  onOnlyHigh={(onlyHigh) => updatePrefs({ ...prefs, onlyHigh })}
                  onRadius={(radiusM) => updatePrefs({ ...prefs, radiusM })}
                  onArea={async () => {
                    const area = fuzz(centerRef.current, 500);
                    const name = (await areaName(area)) ?? "Kaartgebied";
                    updatePrefs({ ...prefs, area, areaName: name });
                    setPushStatus("Gebied ingesteld op het midden van de kaart.");
                  }}
                />
            )}

            {route.name === "jij" && (
                <Jij
                      onReset={async () => {
                    await disablePush().catch(() => {});
                    await store.reset();
                    clearLocal();
                    setPrefs(loadPrefs());
                    setMe(null);
                    go({ name: "start" }, true);
                  }}
                />
            )}
          </div>
          {tab && <BottomNav active={tab} go={(t) => go({ name: t })} />}
        </div>

        {route.name === "start" && (
          <Start
            busy={locating}
            onAllow={async () => {
              await locate(true);
              finishOnboarding();
            }}
            onSkip={finishOnboarding}
          />
        )}

        {route.name === "melden" && (
          <MeldenCategorie
            type={draft.type}
            category={draft.category}
            onType={(type) => setDraft((d) => ({ ...d, type, category: null }))}
            onNext={(category) => {
              setDraft((d) => ({ ...d, category }));
              go({ name: "ernst" });
            }}
            onClose={() => go({ name: "kaart" })}
          />
        )}

        {route.name === "ernst" &&
          (draft.category ? (
            <MeldenErnst
              category={draft.category}
              severity={draft.severity}
              note={draft.note}
              locationSource={reportLocation.source}
              busy={submit.busy}
              error={submit.error}
              onSeverity={(severity) => setDraft((d) => ({ ...d, severity }))}
              onNote={(note) => setDraft((d) => ({ ...d, note }))}
              onBack={() => go({ name: "melden" })}
              onSubmit={placeReport}
            />
          ) : (
            <Redirect to={() => go({ name: "melden" }, true)} />
          ))}

        {route.name === "verzonden" &&
          (draft.category ? (
            <Verzonden
              status={submit.status}
              category={draft.category}
              onDone={() => {
                setDraft(EMPTY_DRAFT);
                go({ name: "kaart" }, true);
              }}
            />
          ) : (
            <Redirect to={() => go({ name: "kaart" }, true)} />
          ))}

        {route.name === "detail" && (
          <Detail
            key={route.id}
            report={selected}
            confirmed={store.hasConfirmed(route.id)}
            own={store.isOwn(route.id)}
            onBack={() => go({ name: "kaart" })}
            onConfirm={async () => {
              const ok = await store.confirm(route.id);
              refresh();
              return ok;
            }}
            onFlag={(reason) => store.flag(route.id, reason)}
          />
        )}

      </div>
    </div>
  );
}

function Redirect({ to }: { to: () => void }) {
  useEffect(() => to(), []);
  return null;
}
