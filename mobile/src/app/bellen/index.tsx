import { useCallback, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@shared/i18n";
import Header from "@/components/Header";
import { Button, Icon, Text } from "@/components/ui";
import { listScenarios, newId, type Scenario } from "@/lib/fakecall";
import { C, R } from "@/theme";

export default function Bellen() {
  const insets = useSafeAreaInsets();
  const [list, setList] = useState<Scenario[]>([]);
  useFocusEffect(useCallback(() => setList(listScenarios()), []));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={t("Nepgesprek")} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: insets.bottom + 24, gap: 10 }}>
        <Text style={{ fontSize: 14, color: C.soft, lineHeight: 20 }}>
          {t("Stel vooraf in wie er belt en wat diegene zegt. Op de kaart start je het gesprek met de belknop. Het scherm lijkt op een gewoon telefoongesprek.")}
        </Text>
        <Text style={{ fontSize: 12, color: C.muted }}>{t("Opnames blijven op je telefoon en worden nooit verstuurd.")}</Text>
        {list.map((s) => (
          <Pressable key={s.id} accessibilityRole="button" onPress={() => router.push(`/bellen/${s.id}`)} style={{ borderRadius: R.sm, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, padding: 14, gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface2, alignItems: "center", justifyContent: "center" }}>
                <Text weight="semibold">{s.name.slice(0, 1)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text weight="medium" style={{ fontSize: 14 }}>
                  {s.name}
                </Text>
                <Text numberOfLines={1} style={{ fontSize: 12, color: C.muted }}>
                  {t("Jij zegt")}: "{s.phrase}"
                </Text>
              </View>
              <Icon name="mic" size={16} color={C.muted} />
            </View>
            <Text style={{ fontSize: 13, color: C.soft }}>"{s.text}"</Text>
            <Text style={{ fontSize: 11, color: C.muted }}>{s.audioUri ? t("Eigen opname") : t("Wordt voorgelezen door je telefoon tot je een opname maakt")}</Text>
          </Pressable>
        ))}
        <Button style={{ marginTop: 6 }} label={t("Nieuw gesprek")} onPress={() => router.push(`/bellen/${newId()}`)} />
      </ScrollView>
    </View>
  );
}
