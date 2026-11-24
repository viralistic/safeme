import { ImageBackground, Linking, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getCategory } from "@shared/categories";
import { t } from "@shared/i18n";
import { nextSteps } from "@shared/nextSteps";
import { Button, Display, Eyebrow, Glass, Icon, Text } from "@/components/ui";
import { useApp } from "@/state";
import { C } from "@/theme";

export default function Verzonden() {
  const { lastStatus, draft, resetDraft } = useApp();
  const insets = useSafeAreaInsets();
  const cat = getCategory(draft.category ?? "");
  const hours = cat ? Math.round(cat.ttlMinutes / 60) : 0;
  const steps = nextSteps(draft.category ?? "");

  const title =
    lastStatus === "approved"
      ? `${t("Gedaan. De buurt")}\n${t("ziet jouw melding")}`
      : lastStatus === "private"
        ? `${t("Gedaan. Alleen de")}\n${t("politie ziet dit")}`
        : `${t("Gedaan. We kijken")}\n${t("even mee")}`;
  const body =
    lastStatus === "approved"
      ? hours === 1
        ? t("Hij staat nu live en vervaagt vanzelf over een uur. Bij nood bel 112.")
        : t("Hij staat nu live en vervaagt vanzelf over {n} uur. Bij nood bel 112.", { n: hours })
      : lastStatus === "private"
        ? t("Je melding staat niet op de openbare kaart. Meldt nog iemand deze plek, dan ziet de politie het. Bij nood bel 112.")
        : t("Je melding wordt kort gecontroleerd en verschijnt daarna op de kaart. Bij nood bel 112.");

  return (
    <ImageBackground source={require("../../assets/img/calm.jpg")} style={{ flex: 1, backgroundColor: C.page }} resizeMode="cover">
      <LinearGradient colors={["rgba(7,10,17,0.5)", "rgba(7,10,17,0.3)", "rgba(7,10,17,0.92)"]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 20, paddingTop: insets.top }}>
        <View style={{ width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: "rgba(255,255,255,0.4)", alignItems: "center", justifyContent: "center" }}>
          <Icon name="check" size={30} stroke={2.4} color="#fff" />
        </View>
        <Display size={28} style={{ textAlign: "center" }}>
          {title}
        </Display>
        <Text style={{ textAlign: "center", fontSize: 13, color: C.soft, maxWidth: 260, lineHeight: 19 }}>{body}</Text>
        {steps.length > 0 && (
          <View style={{ alignSelf: "stretch", gap: 8, marginTop: 4 }}>
            <View style={{ alignItems: "center" }}>
              <Eyebrow>{t("Volgende stap, als je wilt")}</Eyebrow>
            </View>
            {steps.map((s) => (
              <Pressable key={s.href} accessibilityRole="link" onPress={() => Linking.openURL(s.href)}>
                <Glass style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                  <Text weight="medium" style={{ fontSize: 14 }}>
                    {s.label}
                  </Text>
                  <Text style={{ fontSize: 12, color: C.soft }}>{s.detail}</Text>
                </Glass>
              </Pressable>
            ))}
          </View>
        )}
      </View>
      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 16 }}>
        <Button
          red
          label={t("Terug naar kaart")}
          onPress={() => {
            resetDraft();
            router.dismissAll();
          }}
        />
      </View>
    </ImageBackground>
  );
}
