// Step 2: how unsafe. The background reddens as the slider moves.
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, TextInput, View } from "react-native";
import { router } from "expo-router";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getCategory } from "@shared/categories";
import { fuzz } from "@shared/fuzz";
import { t } from "@shared/i18n";
import { level, severityLabel } from "@shared/severity";
import { ERROR_COPY } from "@shared/types";
import Header from "@/components/Header";
import { Button, Eyebrow, Ghost, Icon, Text } from "@/components/ui";
import { useApp } from "@/state";
import { C, F, LEVEL_COLOR, R } from "@/theme";

export default function Ernst() {
  const { draft, setDraft, store, reportPoint, setLastStatus, refresh } = useApp();
  const insets = useSafeAreaInsets();
  const cat = getCategory(draft.category ?? "");
  const welfare = !!cat?.welfare;
  const lv = level(draft.severity);
  const label = severityLabel(draft.severity, welfare);
  const color = welfare ? (lv === "low" ? C.powder : C.cyan) : LEVEL_COLOR[lv];
  const [noteOpen, setNoteOpen] = useState(draft.note.length > 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loc = reportPoint();

  async function submit() {
    if (!draft.category) return router.back();
    setBusy(true);
    setError(null);
    // Pre-fuzz on the phone so a precise point never leaves it. The server fuzzes again.
    const point = fuzz(loc.point, 50);
    const res = await store.submit({ type: draft.type, category: draft.category, severity: draft.severity, note: draft.note.trim() || undefined, hate: draft.type === "incident" && draft.hate, ...point });
    setBusy(false);
    if (!res.ok) {
      setError(ERROR_COPY[res.error]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLastStatus(res.status);
    refresh();
    router.dismissAll();
    router.push("/verzonden");
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
      <LinearGradient
        pointerEvents="none"
        colors={welfare ? ["rgba(56,210,255,0)", "rgba(31,156,255,0.28)", "rgba(31,120,220,0.6)"] : ["rgba(215,52,43,0)", "rgba(215,52,43,0.5)", "rgba(192,34,28,0.95)"]}
        locations={[0.08, 0.58, 1]}
        style={[StyleSheet.absoluteFill, { opacity: draft.severity / 100 }]}
      />
      <Header title={welfare ? `${t("Hoe dringend")}\n${t("lijkt het?")}` : `${t("Hoe onveilig")}\n${t("voelt het?")}`} onBack={() => router.back()} size={26} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 30, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
        <Eyebrow>{cat?.label}</Eyebrow>
        <Text style={{ marginTop: 8, fontFamily: F.semibold, fontSize: 36, letterSpacing: -1, color }}>{label}</Text>
        <View style={{ marginTop: 10, height: 12, borderRadius: 6, overflow: "hidden" }}>
          <LinearGradient colors={welfare ? [C.powder, C.cyan] : [C.powder, C.oxblood, C.red]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </View>
        <Slider
          style={{ marginTop: -28, height: 44 }}
          minimumValue={0}
          maximumValue={100}
          step={1}
          value={draft.severity}
          minimumTrackTintColor="transparent"
          maximumTrackTintColor="transparent"
          thumbTintColor="#fff"
          accessibilityLabel={welfare ? t("Hoe dringend") : t("Hoe onveilig")}
          accessibilityValue={{ text: label }}
          onValueChange={(v) => {
            if (level(v) !== lv) void Haptics.selectionAsync();
            setDraft((d) => ({ ...d, severity: Math.round(v) }));
          }}
        />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
          <Eyebrow>{welfare ? t("Kan wachten") : t("Onprettig")}</Eyebrow>
          <Eyebrow>{welfare ? t("Direct hulp") : t("Direct gevaar")}</Eyebrow>
        </View>

        {(cat?.urgent || lv === "high") && (
          <View style={{ marginTop: 24, borderRadius: R.sm, borderWidth: 1, borderColor: "rgba(255,170,160,0.35)", backgroundColor: "rgba(237,58,44,0.18)", padding: 14 }}>
            <Text accessibilityRole="alert" style={{ fontSize: 14, color: "#fff" }}>
              {cat?.urgent ? `${t("Is er gevaar of zie je vuur of rook? Bel eerst")} 112. ${t("Melden kan daarna, zodat de buren het weten.")}` : `${t("Is er nu gevaar? Bel eerst")} 112. ${t("Melden kan daarna.")}`}
            </Text>
          </View>
        )}

        {cat?.private && (
          <Text style={{ marginTop: 20, fontSize: 13, color: C.soft, lineHeight: 19 }}>
            {t("Deze melding komt niet op de openbare kaart. Alleen de politie ziet hem, en pas als nog iemand dezelfde plek meldt. Beschrijf wat je hoorde of zag, niet hoe iemand eruitziet.")}
          </Text>
        )}

        <View style={{ marginTop: 28, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16, borderTopWidth: 1, borderColor: C.border }}>
          <Icon name="pin" size={18} color={C.muted} />
          <Text weight="medium" style={{ fontSize: 13, flex: 1 }}>
            {loc.source === "device" ? t("Jouw locatie") : t("Midden van de kaart")}
            <Text style={{ fontSize: 11, color: C.muted }}> {t("· vervaagd tot ±100m")}</Text>
          </Text>
        </View>

        {draft.type === "incident" && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, borderTopWidth: 1, borderColor: C.border }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13 }}>{t("Het ging om wie ik ben")}</Text>
              <Text style={{ fontSize: 11, color: C.muted }}>{t("Alleen moderatie en politie zien dit.")}</Text>
            </View>
            <Switch value={draft.hate} onValueChange={(hate) => setDraft((d) => ({ ...d, hate }))} trackColor={{ true: C.red, false: C.surface2 }} accessibilityLabel={t("Het ging om wie ik ben")} />
          </View>
        )}

        {noteOpen ? (
          <View style={{ gap: 6, marginTop: 6 }}>
            <Text style={{ fontSize: 12, color: C.muted }}>{t("Notitie, alleen zichtbaar voor de moderatie. Beschrijf wat er gebeurt, niet hoe iemand eruitziet.")}</Text>
            <TextInput
              multiline
              maxLength={280}
              value={draft.note}
              onChangeText={(note) => setDraft((d) => ({ ...d, note }))}
              placeholder={t("Bijvoorbeeld: iemand probeert fietsen open te breken")}
              placeholderTextColor={C.muted}
              style={{ minHeight: 84, borderRadius: R.sm, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, color: C.fg, padding: 12, fontFamily: F.regular, fontSize: 14, textAlignVertical: "top" }}
            />
            <Text style={{ alignSelf: "flex-end", fontSize: 10, color: C.muted }}>{draft.note.length}/280</Text>
          </View>
        ) : (
          <View style={{ alignItems: "flex-start" }}>
            <Ghost label={t("+ Notitie voor de moderatie")} onPress={() => setNoteOpen(true)} />
          </View>
        )}
      </ScrollView>
      <View style={{ paddingHorizontal: 22, paddingTop: 8, paddingBottom: insets.bottom + 16 }}>
        {error && <Text accessibilityRole="alert" style={{ textAlign: "center", fontSize: 13, color: "#ffd9d4", marginBottom: 10 }}>{error}</Text>}
        <Button red label={busy ? t("Bezig met plaatsen...") : t("Melding plaatsen")} disabled={busy} onPress={submit} />
      </View>
    </KeyboardAvoidingView>
  );
}
