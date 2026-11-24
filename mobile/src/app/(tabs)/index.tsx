import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getCategory } from "@shared/categories";
import { distanceM, type LatLon } from "@shared/fuzz";
import { lookupPlace, searchPlaces, type Place } from "@shared/geo";
import { t } from "@shared/i18n";
import { findRoutes, pickRoute } from "@shared/route";
import MapScreen, { type RouteLine } from "@/components/MapScreen";
import { Button, Chip, Eyebrow, Glass, Icon, Text } from "@/components/ui";
import { useApp } from "@/state";
import { C, R } from "@/theme";

function Pill({ children, active, onPress, label }: { children: React.ReactNode; active?: boolean; onPress?: () => void; label?: string }) {
  const inner = (
    <View style={{ borderRadius: R.pill, overflow: "hidden", borderWidth: 1, borderColor: active ? "rgba(56,210,255,0.5)" : C.border, paddingHorizontal: 12, height: 32, flexDirection: "row", alignItems: "center", gap: 6 }}>
      <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: active ? "rgba(56,210,255,0.18)" : "rgba(10,13,20,0.6)" }]} />
      {children}
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={label} onPress={onPress}>
      {inner}
    </Pressable>
  ) : (
    inner
  );
}

export default function Kaart() {
  const { reports, view, me, locate, fly, walks } = useApp();
  const insets = useSafeAreaInsets();
  const [tonight, setTonight] = useState(false);
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [dest, setDest] = useState<{ name: string; point: LatLon } | null>(null);
  const [route, setRoute] = useState<(RouteLine & { text: string }) | null>(null);
  const [routing, setRouting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const say = (s: string) => {
    setToast(s);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const ctrl = new AbortController();
    const tm = setTimeout(() => searchPlaces(q, ctrl.signal).then(setResults).catch(() => {}), 220);
    return () => {
      clearTimeout(tm);
      ctrl.abort();
    };
  }, [q]);

  const shown = useMemo(() => (tonight ? reports.filter((r) => Date.now() - new Date(r.created_at).getTime() < 6 * 3_600_000) : reports), [reports, tonight]);
  const near = shown.filter((r) => distanceM(r, view) <= 1000);
  const nearHigh = near.filter((r) => r.severity >= 67 && !getCategory(r.category)?.welfare).length;
  const summary =
    near.length === 0
      ? t("Rustig binnen 1 km")
      : t(near.length === 1 ? "1 melding binnen 1 km" : "{n} meldingen binnen 1 km", { n: near.length }) + (nearHigh ? t(", {n} direct gevaar", { n: nearHigh }) : t(", geen direct gevaar"));

  async function planRoute() {
    if (!dest) return;
    setRouting(true);
    try {
      const routes = await findRoutes(me ?? view, dest.point, reports);
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
      setRoute({ best: best.coords, others: routes.filter((r) => r !== best).map((r) => r.coords), text });
    } catch {
      say(t("Er is nu geen route te vinden. Probeer het zo opnieuw."));
    }
    setRouting(false);
  }

  return (
    <View style={{ flex: 1 }}>
      <MapScreen
        reports={shown}
        route={route}
        onPin={(r) => router.push(`/melding/${r.id}`)}
        onWalk={(w) =>
          say(t("{team} loopt hier vanavond, tot {time}", { team: w.team, time: new Date(w.ends_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) }))
        }
      />

      <View pointerEvents="box-none" style={{ position: "absolute", top: insets.top + 10, left: 16, right: 16, gap: 10 }}>
        {searching ? (
          <View style={{ height: 46, borderRadius: R.pill, overflow: "hidden", borderWidth: 1, borderColor: C.border, flexDirection: "row", alignItems: "center", paddingLeft: 16, paddingRight: 4 }}>
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,13,20,0.8)" }]} />
            <Icon name="search" size={17} color={C.muted} />
            <TextInput
              autoFocus
              value={q}
              onChangeText={setQ}
              placeholder={t("Buurt, straat of postcode")}
              placeholderTextColor={C.muted}
              accessibilityLabel={t("Zoek een plek")}
              style={{ flex: 1, color: C.fg, fontSize: 15, marginLeft: 8, fontFamily: "Geist-Regular" }}
              returnKeyType="search"
            />
            <Chip icon="close" size={38} label={t("Zoeken sluiten")} onPress={() => (setSearching(false), setQ(""))} />
          </View>
        ) : (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Glass style={{ width: 42, height: 42 }} radius={12}>
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Icon name="pin" size={20} color={C.red} />
              </View>
            </Glass>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Chip
                icon="locate"
                label={t("Naar mijn locatie")}
                onPress={async () => {
                  const p = me ?? (await locate());
                  if (p) fly(p);
                }}
              />
              <Chip icon="search" label={t("Zoek een plek")} onPress={() => setSearching(true)} />
            </View>
          </View>
        )}

        {searching && results.length > 0 && (
          <View style={{ borderRadius: R.md, overflow: "hidden", borderWidth: 1, borderColor: C.border, backgroundColor: "rgba(10,13,20,0.95)" }}>
            <FlatList
              keyboardShouldPersistTaps="handled"
              data={results}
              keyExtractor={(p) => p.id}
              renderItem={({ item, index }) => (
                <Pressable
                  accessibilityRole="button"
                  onPress={async () => {
                    const pt = await lookupPlace(item.id);
                    setSearching(false);
                    setQ("");
                    if (pt) {
                      setDest({ name: item.name, point: pt });
                      setRoute(null);
                      fly(pt);
                    }
                  }}
                  style={{ paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: index ? 1 : 0, borderColor: C.border }}
                >
                  <Text style={{ fontSize: 14 }}>{item.name}</Text>
                </Pressable>
              )}
            />
          </View>
        )}

        {!searching && (
          <>
            <Pill>
              {[
                [C.powder, t("Laag"), 8],
                [C.oxblood, t("Midden"), 10],
                [C.red, t("Hoog"), 12],
              ].map(([c, l, s]) => (
                <View key={String(l)} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <View style={{ width: Number(s), height: Number(s), borderRadius: 6, backgroundColor: String(c) }} />
                  <Text style={{ fontSize: 11, color: C.muted }}>{String(l)}</Text>
                </View>
              ))}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: C.cyan }} />
                <Text style={{ fontSize: 11, color: C.muted }}>{t("Hulp")}</Text>
              </View>
              {walks.length > 0 && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <View style={{ width: 11, height: 11, borderRadius: 6, borderWidth: 1, borderStyle: "dashed", borderColor: C.cyan }} />
                  <Text style={{ fontSize: 11, color: C.muted }}>{t("Buurtteam")}</Text>
                </View>
              )}
            </Pill>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Pill active={tonight} onPress={() => setTonight(!tonight)} label={t("Vanavond")}>
                <Icon name="moon" size={13} color={tonight ? "#fff" : C.muted} />
                <Text weight="semibold" style={{ fontSize: 11, color: tonight ? "#fff" : C.muted }}>
                  {t("Vanavond")}
                </Text>
              </Pill>
              <Pill>
                <Text accessibilityLiveRegion="polite" style={{ fontSize: 11, color: C.soft }}>
                  {summary}
                </Text>
              </Pill>
            </View>
          </>
        )}
      </View>

      {dest && (
        <View style={{ position: "absolute", left: 16, right: 16, bottom: 92, borderRadius: R.md, borderWidth: 1, borderColor: C.border, backgroundColor: "rgba(10,13,20,0.94)", padding: 16 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Eyebrow color={C.cyan}>{t("Naar")}</Eyebrow>
              <Text weight="medium" numberOfLines={1} style={{ marginTop: 4, fontSize: 15 }}>
                {dest.name}
              </Text>
              {route && <Text style={{ marginTop: 4, fontSize: 13, color: C.soft }}>{route.text}</Text>}
            </View>
            <Chip icon="close" size={36} label={t("Route wissen")} onPress={() => (setDest(null), setRoute(null))} />
          </View>
          {!route && <Button height={44} style={{ marginTop: 12 }} label={routing ? t("Route zoeken...") : t("Kies een rustige route")} disabled={routing} onPress={planRoute} />}
        </View>
      )}

      {toast && (
        <View pointerEvents="none" style={{ position: "absolute", left: 24, right: 24, bottom: dest ? 220 : 92, borderRadius: R.sm, borderWidth: 1, borderColor: "rgba(56,210,255,0.4)", backgroundColor: "rgba(10,13,20,0.92)", padding: 14 }}>
          <Text accessibilityLiveRegion="polite" style={{ textAlign: "center", fontSize: 13 }}>
            {toast}
          </Text>
        </View>
      )}

      {!dest && (
        <View pointerEvents="box-none" style={{ position: "absolute", left: 16, right: 16, bottom: 18, flexDirection: "row", justifyContent: "space-between" }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("Bel me op speaker")} onPress={() => router.push("/bel-me")}>
            <Glass radius={R.pill} style={{ height: 56, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Icon name="phone" size={17} />
              <Text weight="semibold" style={{ fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", color: "#fff" }}>
                {t("Bel me")}
              </Text>
            </Glass>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t("Melden")} onPress={() => router.push("/melden")}>
            <Glass red radius={R.pill} style={{ height: 56, paddingHorizontal: 24, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Icon name="plus" size={17} />
              <Text weight="semibold" style={{ fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", color: "#fff" }}>
                {t("Melden")}
              </Text>
            </Glass>
          </Pressable>
        </View>
      )}
    </View>
  );
}
