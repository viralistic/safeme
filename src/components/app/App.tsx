import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon";
import MapView, { type MapExtra, type MapRoute } from "./MapView";
import { findRoutes, pickRoute } from "@/lib/route";
import { API_URL, DEMO } from "@/lib/store";
import KaartOverlay from "./screens/Kaart";
import Start from "./screens/Start";
import MeldenCategorie from "./screens/MeldenCategorie";
import MeldenErnst from "./screens/MeldenErnst";
import Verzonden from "./screens/Verzonden";
import Detail from "./screens/Detail";
import Meldingen from "./screens/Meldingen";
import Jij from "./screens/Jij";
import Bellen from "./screens/Bellen";
import { CallScreen, CallSheet } from "./FakeCall";
import { clearScenarios, type Scenario } from "@/lib/fakecall";
import { getCategory } from "@/lib/categories";
import { distanceM } from "@/lib/fuzz";
import { BottomNav, type Tab } from "./ui";
import { createStore } from "@/lib/store";
import { fuzz, inNetherlands, type LatLon } from "@/lib/fuzz";
import { areaName, DEFAULT_CENTER, getDevicePosition, lastArea, rememberArea, type LocationSource } from "@/lib/geo";
import { clearLocal, loadPrefs, savePrefs, type AlertPrefs } from "@/lib/prefs";
import { disablePush, enablePush } from "@/lib/push";
import { ERROR_COPY, type PublicReport } from "@/lib/types";
import type { ReportType } from "@/lib/categories";
import { locale, t } from "@/lib/i18n";

type Route =
  | { name: "start" }
  | { name: "kaart" }
  | { name: "melden" }
  | { name: "ernst" }
  | { name: "verzonden" }
  | { name: "detail"; id: string }
  | { name: "meldingen" }
  | { name: "jij" }
  | { name: "bellen" };

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
    case "bellen":
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
  hate: boolean;
}

const EMPTY_DRAFT: Draft = { type: "situation", category: null, severity: 50, note: "", hate: false };

export default function App() {
  const [route, setRoute] = useState<Route>(() => (onboarded() ? parse(location.hash) : { name: "start" }));
  const centerRef = useRef<LatLon>(lastArea() ?? DEFAULT_CENTER);
  const [center, setCenter] = useState<LatLon>(centerRef.current);
  const [flyKey, setFlyKey] = useState(0);
  const [me, setMe] = useState<LatLon | null>(null);
  const store = useMemo(() => createStore(() => centerRef.current), []);
  const [reports, setReports] = useState<PublicReport[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [submit, setSubmit] = useState<{ busy: boolean; error: string | null; status: "approved" | "pending" | "private" }>({ busy: false, error: null, status: "approved" });
  const [locating, setLocating] = useState(false);
  const [prefs, setPrefs] = useState<AlertPrefs>(loadPrefs);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const [tonight, setTonight] = useState(false);
  const [viewCenter, setViewCenter] = useState<LatLon>(centerRef.current);
  const [callSheet, setCallSheet] = useState(false);
  const [pendingCall, setPendingCall] = useState<{ scenario: Scenario; at: number } | null>(null);
  const [activeCall, setActiveCall] = useState<Scenario | null>(null);
  const [walks, setWalks] = useState<MapExtra[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [dest, setDest] = useState<{ name: string; point: LatLon } | null>(null);
  const [walkRoute, setWalkRoute] = useState<(MapRoute & { text: string }) | null>(null);
  const [routing, setRouting] = useState(false);

  async function planRoute() {
    if (!dest) return;
    setRouting(true);
    try {
      const from = me ?? centerRef.current;
      const routes = await findRoutes(from, dest.point, reports);
      const best = pickRoute(routes);
      if (!best) throw new Error("none");
      const min = Math.max(1, Math.round(best.seconds / 60));
      const km = (best.meters / 1000).toFixed(1).replace(".", ",");
      const worst = Math.max(...routes.map((r) => r.passes));
      const text =
        best.passes === 0
          ? t("{min} min lopen, {km} km. Langs geen recente meldingen.", { min, km })
          : t(best.passes === 1 ? "{min} min lopen, {km} km. Langs 1 recente melding" : "{min} min lopen, {km} km. Langs {n} recente meldingen", { min, km, n: best.passes }) +
            (worst > best.passes ? t(", minder dan de andere routes") : "") +
            ".";
      setWalkRoute({ best: best.coords, others: routes.filter((r) => r !== best).map((r) => r.coords), text });
    } catch {
      setToast(t("Er is nu geen route te vinden. Probeer het zo opnieuw."));
    }
    setRouting(false);
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!pendingCall) return;
    const t = setTimeout(() => {
      setActiveCall(pendingCall.scenario);
      setPendingCall(null);
    }, Math.max(0, pendingCall.at - Date.now()));
    return () => clearTimeout(t);
  }, [pendingCall]);

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
    // Buurtteams on an avondwandeling show on the public map: a calm sign.
    if (!DEMO)
      fetch(`${API_URL.replace(/\/$/, "")}/walks`)
        .then((r) => (r.ok ? r.json() : []))
        .then((list: { id: string; team: string; lat: number; lon: number; ends_at: string }[]) =>
          setWalks(
            list.map((w) => ({
              id: w.id,
              lat: w.lat,
              lon: w.lon,
              kind: "walk",
              label: t("{team} loopt hier vanavond, tot {time}", { team: w.team, time: new Date(w.ends_at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) }),
            })),
          ),
        )
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
    const res = await store.submit({ type: draft.type, category: draft.category, severity: draft.severity, note: draft.note.trim() || undefined, hate: draft.type === "incident" && draft.hate, ...point });
    if (!res.ok) return setSubmit({ busy: false, error: ERROR_COPY[res.error], status: "approved" });
    setSubmit({ busy: false, error: null, status: res.status });
    refresh();
    go({ name: "verzonden" }, true);
  }

  // "Vanavond": only what was reported in the last six hours.
  const shown = tonight ? reports.filter((r) => Date.now() - new Date(r.created_at).getTime() < 6 * 3_600_000) : reports;
  const near = shown.filter((r) => distanceM(r, viewCenter) <= 1000);
  const nearHigh = near.filter((r) => r.severity >= 67 && !getCategory(r.category)?.welfare).length;
  const summary =
    near.length === 0
      ? t("Rustig binnen 1 km")
      : t(near.length === 1 ? "1 melding binnen 1 km" : "{n} meldingen binnen 1 km", { n: near.length }) +
        (nearHigh ? t(", {n} direct gevaar", { n: nearHigh }) : t(", geen direct gevaar"));

  const tab: Tab | null = route.name === "kaart" ? "kaart" : route.name === "meldingen" ? "meldingen" : route.name === "jij" ? "jij" : null;
  const selected = route.name === "detail" ? reports.find((r) => r.id === route.id) ?? null : null;

  return (
    <div className="app-root">
      <div className="app-frame">
        <div className="absolute inset-0 flex flex-col">
          <div className="relative flex-1">
            <MapView
              reports={shown}
              center={center}
              flyKey={flyKey}
              me={me}
              onSelect={(r) => go({ name: "detail", id: r.id })}
              extras={walks}
              route={walkRoute}
              onExtra={(e) => setToast(e.label)}
              onMove={(c) => {
                centerRef.current = c;
                setViewCenter(c);
              }}
            />
            {route.name === "kaart" && (
              <KaartOverlay
                count={shown.length}
                tonight={tonight}
                summary={summary}
                onTonight={setTonight}
                onCall={() => setCallSheet(true)}
                onReport={() => {
                  setDraft(EMPTY_DRAFT);
                  setSubmit({ busy: false, error: null, status: "approved" });
                  go({ name: "melden" });
                }}
                onLocate={() => locate(true)}
                onPlace={(p, name) => {
                  setDest({ name, point: p });
                  setWalkRoute(null);
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
                      name = (await areaName(area)) ?? t("Kaartgebied");
                    }
                    const next = { ...prefs, area, areaName: name, push: on };
                    if (on) {
                      const state = await enablePush(next);
                      if (state === "denied") {
                        setPushStatus(t("Meldingen staan uit in je browser. Zet ze aan in de instellingen."));
                        next.push = false;
                      } else if (state === "unsupported") next.push = false;
                      else if (state === "no-backend") setPushStatus(t("Opgeslagen op dit toestel. Pushmeldingen werken zodra de app live is."));
                    } else await disablePush().catch(() => {});
                    updatePrefs(next);
                    setPushBusy(false);
                  }}
                  onOnlyHigh={(onlyHigh) => updatePrefs({ ...prefs, onlyHigh })}
                  onRadius={(radiusM) => updatePrefs({ ...prefs, radiusM })}
                  onArea={async () => {
                    const area = fuzz(centerRef.current, 500);
                    const name = (await areaName(area)) ?? t("Kaartgebied");
                    updatePrefs({ ...prefs, area, areaName: name });
                    setPushStatus(t("Gebied ingesteld op het midden van de kaart."));
                  }}
                />
            )}

            {route.name === "jij" && (
                <Jij
                  onCalls={() => go({ name: "bellen" })}
                  onReset={async () => {
                    await clearScenarios();
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
              hate={draft.hate}
              onHate={draft.type === "incident" ? (hate) => setDraft((d) => ({ ...d, hate })) : undefined}
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

        {route.name === "bellen" && <Bellen onBack={() => go({ name: "jij" })} />}

        {pendingCall && !activeCall && (
          <div className="absolute inset-x-0 top-[calc(env(safe-area-inset-top)+64px)] z-30 flex justify-center">
            <button type="button" className="rounded-full border border-border bg-[rgba(10,13,20,.85)] px-4 py-2 text-[12px] text-[#cfd3dd] backdrop-blur" onClick={() => setPendingCall(null)}>
              {t("Gesprek komt eraan · tik om te annuleren")}
            </button>
          </div>
        )}

        {callSheet && (
          <CallSheet
            onClose={() => setCallSheet(false)}
            onSetup={() => {
              setCallSheet(false);
              go({ name: "bellen" });
            }}
            onStart={(scenario, delaySec) => {
              setCallSheet(false);
              if (delaySec === 0) setActiveCall(scenario);
              else setPendingCall({ scenario, at: Date.now() + delaySec * 1000 });
            }}
          />
        )}

        {route.name === "kaart" && dest && (
          <div className="absolute inset-x-4 bottom-[160px] z-20 rounded-2xl border border-border bg-[rgba(10,13,20,.92)] p-4 backdrop-blur" role="region" aria-label={t("Route")}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="eyebrow text-cyan">{t("Naar")}</p>
                <p className="mt-1 truncate text-[15px] font-medium">{dest.name}</p>
                {walkRoute && <p className="mt-1 text-[13px] leading-snug text-[#cfd3dd]">{walkRoute.text}</p>}
              </div>
              <button type="button" className="chip h-9! w-9! shrink-0" aria-label={t("Route wissen")} onClick={() => (setDest(null), setWalkRoute(null))}>
                <Icon name="close" size={15} />
              </button>
            </div>
            {!walkRoute && (
              <button type="button" className="btn glass mt-3 h-11!" onClick={planRoute} disabled={routing}>
                <span>{routing ? t("Route zoeken...") : t("Kies een rustige route")}</span>
              </button>
            )}
          </div>
        )}

        {toast && (
          <div className="pointer-events-none absolute inset-x-6 bottom-[160px] z-30 rounded-xl border border-[rgba(56,210,255,.4)] bg-[rgba(10,13,20,.9)] px-4 py-3 text-center text-[13px] backdrop-blur" role="status">
            {toast}
          </div>
        )}

        {activeCall && <CallScreen scenario={activeCall} onEnd={() => setActiveCall(null)} />}
      </div>
    </div>
  );
}

function Redirect({ to }: { to: () => void }) {
  useEffect(() => to(), []);
  return null;
}
