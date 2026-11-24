// Edit one fake call: who calls, what you say, and their own recorded voice.
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AudioModule, RecordingPresets, createAudioPlayer, setAudioModeAsync, useAudioRecorder, useAudioRecorderState, type AudioPlayer } from "expo-audio";
import * as Speech from "expo-speech";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { lang, t } from "@shared/i18n";
import Header from "@/components/Header";
import { Button, Ghost, Text } from "@/components/ui";
import { deleteScenario, getScenario, saveScenario, type Scenario } from "@/lib/fakecall";
import { C, F, R } from "@/theme";

function Field({ label, value, onChange, placeholder, multiline }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; multiline?: boolean }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, color: C.muted }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        multiline={multiline}
        maxLength={multiline ? 240 : 40}
        style={{ minHeight: multiline ? 84 : 48, borderRadius: R.sm, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, color: C.fg, paddingHorizontal: 12, paddingVertical: multiline ? 12 : 0, fontFamily: F.regular, fontSize: 15, textAlignVertical: multiline ? "top" : "center" }}
      />
    </View>
  );
}

export default function EditCall() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const existing = getScenario(id ?? "");
  const [s, setS] = useState<Scenario>(existing ?? { id: id ?? "", name: "", phrase: "", text: "", audioUri: null, createdAt: Date.now() });
  const [error, setError] = useState<string | null>(null);
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, directory: "document" });
  const rec = useAudioRecorderState(recorder);
  const preview = useRef<AudioPlayer | null>(null);
  const valid = s.name.trim() && s.text.trim();

  useEffect(() => () => stopPreview(), []);

  function stopPreview() {
    preview.current?.pause();
    preview.current?.release();
    preview.current = null;
    void Speech.stop();
  }

  async function record() {
    setError(null);
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) return setError(t("Je microfoon is niet beschikbaar. Je kunt ook een geluidsbestand kiezen."));
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setTimeout(() => recorder.isRecording && void stop(), 30_000);
  }

  async function stop() {
    await recorder.stop();
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    if (recorder.uri) setS((v) => ({ ...v, audioUri: recorder.uri }));
  }

  function listen() {
    stopPreview();
    if (s.audioUri) {
      const p = createAudioPlayer({ uri: s.audioUri });
      p.play();
      preview.current = p;
    } else if (s.text) Speech.speak(s.text, { language: lang === "en" ? "en-GB" : "nl-NL" });
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={existing?.name || t("Nieuw gesprek")} onBack={() => router.back()} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 16, paddingBottom: insets.bottom + 24, gap: 16 }}>
        <Field label={t("Naam op het scherm")} value={s.name} placeholder={t("Pap")} onChange={(name) => setS({ ...s, name })} />
        <Field label={t("Wat jij zegt als je opneemt")} value={s.phrase} placeholder={t("Hey pap")} onChange={(phrase) => setS({ ...s, phrase })} />
        <Field label={t("Wat diegene zegt")} value={s.text} placeholder={t("Ik sta om de hoek met de auto, waar ben je?")} onChange={(text) => setS({ ...s, text })} multiline />

        <View style={{ borderRadius: R.sm, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, padding: 16, gap: 10 }}>
          <Text weight="medium" style={{ fontSize: 14 }}>
            {t("Opname")}
          </Text>
          <Text style={{ fontSize: 12, color: C.muted, lineHeight: 17 }}>{t("Laat diegene de tekst inspreken, of kies een bestand. Zonder opname leest je telefoon de tekst voor.")}</Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {rec.isRecording ? (
              <Button red height={44} icon="stop" label={`${t("Stop")} ${Math.round((rec.durationMillis ?? 0) / 1000)}s`} onPress={stop} style={{ flexGrow: 1 }} />
            ) : (
              <Button height={44} icon="mic" label={t("Opnemen")} onPress={record} style={{ flexGrow: 1 }} />
            )}
            <Button height={44} icon="play" label={t("Luister")} onPress={listen} disabled={!s.audioUri && !s.text} style={{ flexGrow: 1 }} />
          </View>
          {s.audioUri && <Ghost label={t("Opname wissen")} onPress={() => setS({ ...s, audioUri: null })} />}
          {error && (
            <Text accessibilityRole="alert" style={{ fontSize: 12, color: "#ffd9d4" }}>
              {error}
            </Text>
          )}
        </View>

        <Button
          red
          disabled={!valid}
          label={t("Bewaar")}
          onPress={() => {
            saveScenario({ ...s, name: s.name.trim(), phrase: s.phrase.trim() || `${t("Hoi")} ${s.name.trim()}`, text: s.text.trim() });
            router.back();
          }}
        />
        {existing && (
          <Ghost
            label={t("Verwijder dit gesprek")}
            onPress={() => {
              deleteScenario(s.id);
              router.back();
            }}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
