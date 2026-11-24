import { useState } from "react";
import { ImageBackground, ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getCategory } from "@shared/categories";
import { t } from "@shared/i18n";
import { level, severityLabel } from "@shared/severity";
import { ago, minutesSince, remaining, shortDuration } from "@shared/time";
import type { FlagReason } from "@shared/types";
import { Button, Chip, Display, Eyebrow, Ghost, Note112, Row, Text } from "@/components/ui";
import { useApp } from "@/state";
import { C, LEVEL_COLOR } from "@/theme";

const REASONS: { id: FlagReason; label: string }[] = [
  { id: "onjuist", label: t("Klopt niet of is verzonnen") },
  { id: "persoon", label: t("Richt zich op een persoon of groep") },
  { id: "spam", label: t("Spam of reclame") },
];

export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { reports, store, refresh } = useApp();
  const insets = useSafeAreaInsets();
  const report = reports.find((r) => r.id === id);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);

  if (!report) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 }}>
        <Display size={24}>{t("Deze melding is vervaagd")}</Display>
        <Text style={{ color: C.muted, fontSize: 13 }}>{t("Meldingen verdwijnen vanzelf na een tijdje.")}</Text>
        <Button style={{ alignSelf: "stretch", marginTop: 16 }} label={t("Terug naar kaart")} onPress={() => router.back()} />
      </View>
    );
  }

  const cat = getCategory(report.category);
  const welfare = !!cat?.welfare;
  const lv = level(report.severity);
  const own = store.isOwn(report.id);
  const confirmed = store.hasConfirmed(report.id);
  const eyebrow = welfare ? C.cyan : lv === "mid" ? "#e46a74" : LEVEL_COLOR[lv];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ImageBackground source={require("../../../assets/img/detail.jpg")} style={{ height: 250 }} resizeMode="cover">
        <LinearGradient colors={["rgba(7,10,17,0.15)", "rgba(7,10,17,0.35)", "rgba(7,10,17,0.92)"]} locations={[0, 0.5, 0.95]} style={StyleSheet.absoluteFill} />
        <View style={{ position: "absolute", top: insets.top + 8, left: 20 }}>
          <Chip icon="back" label={t("Terug naar kaart")} onPress={() => router.back()} />
        </View>
        <View style={{ position: "absolute", left: 24, right: 24, bottom: 20 }}>
          <Eyebrow color={eyebrow}>
            {severityLabel(report.severity, welfare)} · {shortDuration(minutesSince(report.created_at))}
          </Eyebrow>
          <Display size={30} style={{ marginTop: 8 }}>
            {cat?.label ?? t("Melding")}
          </Display>
        </View>
      </ImageBackground>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: insets.bottom + 20, flexGrow: 1 }}>
        <Row icon="clock" term={t("Gemeld")} value={ago(report.created_at)} />
        <Row icon="clock" term={t("Vervaagt over")} value={remaining(report.expires_at)} />
        <Row icon="users" term={t("Herkend door")} value={report.confirmations === 0 ? t("nog niemand") : report.confirmations === 1 ? t("1 persoon") : t("{n} mensen", { n: report.confirmations })} />
        <Row icon="lock" term={t("Locatie")} value={t("· vervaagd tot ±100m").replace("· ", "")} />
        {report.category === "explosie" && (
          <Text style={{ marginTop: 14, fontSize: 13, color: C.soft, lineHeight: 19 }}>
            {t("Na een explosie: blijf uit de buurt tot de hulpdiensten klaar zijn. Woon je ernaast en slaap je er slecht van? Slachtofferhulp helpt ook buren, gratis.")}
          </Text>
        )}
        {welfare && <Text style={{ marginTop: 14, fontSize: 13, color: C.cyan, lineHeight: 19 }}>{t("Iemand lijkt hier hulp nodig te hebben. Kijk of het goed gaat, of bel 112 als het niet goed gaat.")}</Text>}
        <Text style={{ marginTop: 14, fontSize: 12, color: C.muted }}>{t("Omschrijvingen zijn niet openbaar. Zo blijft iedereen anoniem.")}</Text>

        <View style={{ flex: 1, minHeight: 24 }} />
        {flagOpen ? (
          <View style={{ gap: 8 }}>
            <Text weight="medium" style={{ fontSize: 13 }}>
              {t("Wat klopt er niet?")}
            </Text>
            {REASONS.map((r) => (
              <Button
                key={r.id}
                height={48}
                label={r.label}
                disabled={busy}
                onPress={async () => {
                  setBusy(true);
                  await store.flag(report.id, r.id);
                  setBusy(false);
                  setFlagged(true);
                  setFlagOpen(false);
                }}
              />
            ))}
            <Ghost label={t("Annuleren")} onPress={() => setFlagOpen(false)} />
          </View>
        ) : (
          <View style={{ gap: 6 }}>
            <Button
              label={own ? t("Dit is jouw melding") : confirmed ? t("Bedankt, je telt mee") : t("Dit herken ik ook")}
              disabled={busy || own || confirmed}
              onPress={async () => {
                setBusy(true);
                await store.confirm(report.id);
                setBusy(false);
                refresh();
                setTick((n) => n + 1);
              }}
            />
            {flagged ? (
              <Text accessibilityLiveRegion="polite" style={{ textAlign: "center", color: C.muted, fontSize: 13, paddingVertical: 12 }}>
                {t("Bedankt. We kijken ernaar.")}
              </Text>
            ) : (
              <Ghost label={t("Rapporteer misbruik")} disabled={own} onPress={() => setFlagOpen(true)} />
            )}
            <Note112 />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
