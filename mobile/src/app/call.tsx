// The fake incoming call. Looks like a phone call, no app name anywhere.
import { useEffect, useRef, useState } from "react";
import { Pressable, Vibration, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import * as Speech from "expo-speech";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { lang, t } from "@shared/i18n";
import { Icon, Text } from "@/components/ui";
import { getScenario } from "@/lib/fakecall";

function clock(sec: number) {
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}

function Round({ color, label, onPress, rotate }: { color: string; label: string; onPress: () => void; rotate?: boolean }) {
  return (
    <View style={{ alignItems: "center", gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ width: 76, height: 76, borderRadius: 38, backgroundColor: color, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.8 : 1 })}>
        <View style={{ transform: [{ rotate: rotate ? "135deg" : "0deg" }] }}>
          <Icon name="phone" size={30} color="#fff" />
        </View>
      </Pressable>
      <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{label}</Text>
    </View>
  );
}

export default function Call() {
  const { id, answered } = useLocalSearchParams<{ id: string; answered?: string }>();
  const scenario = getScenario(id ?? "");
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<"ringing" | "active">(answered ? "active" : "ringing");
  const [sec, setSec] = useState(0);
  const ring = useRef<AudioPlayer | null>(null);
  const voice = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "doNotMix" });
    if (state === "ringing") {
      const p = createAudioPlayer(require("../../assets/sounds/ring.wav"));
      p.loop = true;
      p.play();
      ring.current = p;
      Vibration.vibrate([0, 700, 500], true);
    } else play();
    return () => stopAll();
  }, []);

  useEffect(() => {
    if (state !== "active") return;
    const tm = setInterval(() => setSec((n) => n + 1), 1000);
    return () => clearInterval(tm);
  }, [state]);

  function stopRing() {
    ring.current?.pause();
    ring.current?.release();
    ring.current = null;
    Vibration.cancel();
  }

  function stopAll() {
    stopRing();
    voice.current?.pause();
    voice.current?.release();
    voice.current = null;
    void Speech.stop();
  }

  function play() {
    if (!scenario) return;
    // A short pause, as when someone picks up.
    setTimeout(() => {
      if (scenario.audioUri) {
        const p = createAudioPlayer({ uri: scenario.audioUri });
        p.play();
        voice.current = p;
      } else Speech.speak(scenario.text, { language: lang === "en" ? "en-GB" : "nl-NL", rate: 1.0 });
    }, 700);
  }

  function answer() {
    stopRing();
    setState("active");
    play();
  }

  function hangUp() {
    stopAll();
    router.back();
  }

  const name = scenario?.name ?? "";
  return (
    <LinearGradient colors={["#1c1f26", "#0d0f14"]} style={{ flex: 1, alignItems: "center", paddingTop: insets.top + 72, paddingBottom: insets.bottom + 48, paddingHorizontal: 32 }}>
      <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: "#3a3f4b", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 40, color: "#fff" }}>{name.slice(0, 1)}</Text>
      </View>
      <Text style={{ marginTop: 22, fontSize: 34, color: "#fff", letterSpacing: -0.5 }}>{name}</Text>
      <Text style={{ marginTop: 4, fontSize: 16, color: "rgba(255,255,255,0.6)" }}>{state === "ringing" ? t("mobiel") : clock(sec)}</Text>

      {state === "active" && (
        <View style={{ marginTop: "auto", marginBottom: 48, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", rowGap: 22, columnGap: 30, maxWidth: 300 }}>
          {[t("dempen"), t("toetsen"), "speaker", t("gesprek +"), "FaceTime", t("contacten")].map((l) => (
            <View key={l} style={{ alignItems: "center", gap: 8, width: 70 }}>
              <View style={{ width: 66, height: 66, borderRadius: 33, backgroundColor: l === "speaker" ? "#fff" : "rgba(255,255,255,0.15)" }} />
              <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>{l}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ marginTop: state === "ringing" ? "auto" : 0, flexDirection: "row", justifyContent: "space-around", alignSelf: "stretch" }}>
        {state === "ringing" ? (
          <>
            <Round color="#ff3b30" label={t("Weiger")} onPress={hangUp} rotate />
            <Round color="#34c759" label={t("Accepteer")} onPress={answer} />
          </>
        ) : (
          <Round color="#ff3b30" label={t("Beëindig")} onPress={hangUp} rotate />
        )}
      </View>
    </LinearGradient>
  );
}
