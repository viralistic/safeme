import { useState } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@shared/i18n";
import Globe from "@/components/Globe";
import { Button, Display, Ghost, Note112, Text } from "@/components/ui";
import { useApp } from "@/state";
import { C } from "@/theme";

export default function Start() {
  const { locate, fly, setOnboarded } = useApp();
  const [busy, setBusy] = useState(false);
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get("window");
  const size = width * 1.05;

  function done() {
    setOnboarded();
    router.replace("/");
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.page }}>
      <View style={{ position: "absolute", right: -size * 0.28, top: insets.top + 40 }}>
        <Globe size={size} />
      </View>
      <LinearGradient colors={["rgba(8,11,18,0.45)", "rgba(8,11,18,0.15)", "rgba(8,11,18,0.96)"]} locations={[0, 0.4, 0.75]} style={StyleSheet.absoluteFill} />
      <View style={{ flex: 1, justifyContent: "flex-end", paddingHorizontal: 26, paddingBottom: insets.bottom + 20 }}>
        <Display size={34}>
          {t("Zie waar het")}
          {"\n"}
          {t("onveilig is in")}
          {"\n"}
          {t("jouw buurt")}
        </Display>
        <View style={{ marginTop: 20, gap: 8 }}>
          {[t("Meld in twee tikken."), t("Zie wat anderen melden."), t("Kies een veilige route.")].map((s, i) => (
            <Text key={s} style={{ color: C.soft, fontSize: 14 }}>
              <Text weight="medium" style={{ color: C.cyan, fontSize: 14 }}>
                {i + 1}
                {"  "}
              </Text>
              {s}
            </Text>
          ))}
        </View>
        <View style={{ marginTop: 26, gap: 4 }}>
          <Button
            red
            label={busy ? t("Even zoeken...") : t("Locatie toestaan")}
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              const p = await locate();
              setBusy(false);
              if (p) fly(p);
              done();
            }}
          />
          <Ghost label={t("Eerst rondkijken")} onPress={done} />
          <Note112 style={{ marginTop: 4 }} />
        </View>
      </View>
    </View>
  );
}
