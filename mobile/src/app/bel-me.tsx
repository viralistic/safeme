// The sheet that starts a fake call.
import { useCallback, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { t } from "@shared/i18n";
import { Button, Display, Ghost, Segments, Text } from "@/components/ui";
import { listScenarios, scheduleCall, type Scenario } from "@/lib/fakecall";
import { C, R } from "@/theme";

const DELAYS = [0, 10, 30, 60];
const delayLabel = (s: number) => (s === 0 ? t("Nu") : s < 60 ? `${s} sec` : "1 min");

export default function BelMe() {
  const [list, setList] = useState<Scenario[]>([]);
  const [pick, setPick] = useState<string | null>(null);
  const [delay, setDelay] = useState(10);
  useFocusEffect(
    useCallback(() => {
      const l = listScenarios();
      setList(l);
      setPick((p) => p ?? l[0]?.id ?? null);
    }, []),
  );
  const chosen = list.find((s) => s.id === pick);

  return (
    <ScrollView style={{ backgroundColor: "#0b0e16" }} contentContainerStyle={{ padding: 20, paddingTop: 28, gap: 16 }}>
      <View>
        <Display size={24}>{t("Bel me op speaker")}</Display>
        <Text style={{ marginTop: 4, color: C.muted, fontSize: 13 }}>{t("Een nepgesprek, zodat je een uitweg hebt.")}</Text>
      </View>
      <View accessibilityRole="radiogroup" accessibilityLabel={t("Wie belt er")} style={{ gap: 8 }}>
        {list.map((s) => {
          const on = pick === s.id;
          return (
            <Pressable
              key={s.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => setPick(s.id)}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: R.sm, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, borderColor: on ? "rgba(255,170,160,0.35)" : C.border, backgroundColor: on ? "rgba(237,58,44,0.18)" : C.surface }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface2, alignItems: "center", justifyContent: "center" }}>
                <Text weight="semibold">{s.name.slice(0, 1)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text weight="medium" style={{ fontSize: 14 }}>
                  {s.name}
                </Text>
                <Text numberOfLines={1} style={{ fontSize: 12, color: C.muted }}>
                  {t("Zeg")}: "{s.phrase}"
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: C.muted }}>{s.audioUri ? t("eigen opname") : t("voorgelezen")}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ gap: 8 }}>
        <Text weight="medium" style={{ fontSize: 13 }}>
          {t("Wanneer")}
        </Text>
        <Segments label={t("Wanneer")} value={delay} onChange={setDelay} options={DELAYS.map((d) => ({ v: d, label: delayLabel(d) }))} />
      </View>
      <Button
        red
        disabled={!chosen}
        label={delay === 0 ? t("Bel me nu") : t("Bel me over {delay}", { delay: delayLabel(delay) })}
        onPress={async () => {
          if (!chosen) return;
          router.back();
          await scheduleCall(chosen, delay);
        }}
      />
      <Ghost label={t("Gesprekken instellen")} onPress={() => (router.back(), router.push("/bellen"))} />
    </ScrollView>
  );
}
