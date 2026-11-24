// Alert settings. Saved on the phone; native push arrives in a later version.
import { useState } from "react";
import { ScrollView, Switch, View } from "react-native";
import { areaName } from "@shared/geo";
import { fuzz, type LatLon } from "@shared/fuzz";
import { t } from "@shared/i18n";
import Header from "@/components/Header";
import { Icon, Note112, Segments, Text } from "@/components/ui";
import * as kv from "@/lib/kv";
import { useApp } from "@/state";
import { C } from "@/theme";

interface Prefs {
  push: boolean;
  onlyHigh: boolean;
  radiusM: 500 | 1000 | 2000;
  area: LatLon | null;
  areaName: string | null;
}

export default function Meldingen() {
  const { view } = useApp();
  const [p, setP] = useState<Prefs>(kv.get<Prefs>("prefs", { push: false, onlyHigh: false, radiusM: 1000, area: null, areaName: null }));
  const save = (n: Prefs) => (setP(n), kv.set("prefs", n));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={t("Meldingen")} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 16, paddingBottom: 30 }}>
        {[
          [t("Push bij nieuwe melding"), "push"],
          [t("Alleen direct gevaar"), "onlyHigh"],
        ].map(([label, key], i) => (
          <View key={key} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 18, borderTopWidth: i ? 1 : 0, borderColor: C.border, opacity: key === "onlyHigh" && !p.push ? 0.5 : 1 }}>
            <Text weight="medium" style={{ fontSize: 14 }}>
              {label}
            </Text>
            <Switch
              accessibilityLabel={label}
              disabled={key === "onlyHigh" && !p.push}
              value={p[key as "push" | "onlyHigh"]}
              trackColor={{ true: C.red, false: C.surface2 }}
              onValueChange={(v) => save({ ...p, [key]: v })}
            />
          </View>
        ))}
        {p.push && <Text style={{ fontSize: 12, color: C.muted, paddingBottom: 8 }}>{t("Pushmeldingen in de app komen in een volgende versie. Je keuze is bewaard.")}</Text>}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 18, borderTopWidth: 1, borderColor: C.border, marginTop: 8 }}>
          <Icon name="pin" size={18} color={C.muted} />
          <View style={{ flex: 1 }}>
            <Text weight="medium" style={{ fontSize: 14 }}>
              {p.areaName ?? t("Nog geen gebied")}
            </Text>
            <Text style={{ fontSize: 11, color: C.muted }}>{t("Je gebied wordt vervaagd tot ±500m")}</Text>
          </View>
          <Text
            weight="semibold"
            accessibilityRole="button"
            onPress={async () => {
              const area = fuzz(view, 500);
              save({ ...p, area, areaName: (await areaName(area)) ?? t("Kaartgebied") });
            }}
            style={{ color: C.red, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", padding: 8 }}
          >
            {p.area ? t("Wijzig") : t("Kies")}
          </Text>
        </View>

        <View style={{ paddingVertical: 18, borderTopWidth: 1, borderColor: C.border, gap: 12 }}>
          <Text weight="medium" style={{ fontSize: 14 }}>
            {t("Straal")}
          </Text>
          <Segments label={t("Straal")} value={p.radiusM} onChange={(radiusM) => save({ ...p, radiusM })} options={[500, 1000, 2000].map((r) => ({ v: r as Prefs["radiusM"], label: r < 1000 ? `${r} m` : `${r / 1000} km` }))} />
        </View>
        <Text style={{ fontSize: 12, color: C.muted, lineHeight: 17 }}>{t("Je krijgt alleen een seintje voor meldingen in je gebied. Safety Map is geen alarmdienst.")}</Text>
        <Note112 style={{ marginTop: 24 }} />
      </ScrollView>
    </View>
  );
}
