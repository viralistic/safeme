// Step 1: the category wheel. Scroll snaps to a category, a light tap of haptics per step.
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { categoriesFor, TYPE_LABEL, type ReportType } from "@shared/categories";
import { t } from "@shared/i18n";
import Header from "@/components/Header";
import { Button, Text } from "@/components/ui";
import { useApp } from "@/state";
import { C, F } from "@/theme";

const ITEM = 68;

export default function Melden() {
  const { draft, setDraft } = useApp();
  const insets = useSafeAreaInsets();
  const items = categoriesFor(draft.type);
  const [index, setIndex] = useState(Math.min(2, items.length - 1));
  const [height, setHeight] = useState(0);
  const scroll = useRef<ScrollViewInstance>(null);
  const pad = Math.max(0, height / 2 - ITEM / 2);

  useEffect(() => {
    const i = Math.min(2, items.length - 1);
    setIndex(i);
    requestAnimationFrame(() => scroll.current?.scrollTo({ y: i * ITEM, animated: false }));
  }, [draft.type, height]);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.max(0, Math.min(items.length - 1, Math.round(e.nativeEvent.contentOffset.y / ITEM)));
    if (i !== index) {
      setIndex(i);
      void Haptics.selectionAsync();
    }
  }

  const selected = items[index];
  const next = (id: string) => {
    setDraft((d) => ({ ...d, category: id }));
    router.push("/ernst");
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={draft.type === "situation" ? t("Wat zie je?") : t("Wat overkomt je?")} onClose={() => router.back()} />
      <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 28, paddingHorizontal: 22, paddingTop: 16, paddingBottom: 16 }}>
        {(["situation", "incident"] as ReportType[]).map((tp) => {
          const on = draft.type === tp;
          return (
            <Pressable key={tp} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setDraft((d) => ({ ...d, type: tp, category: null, hate: false }))}>
              <Text weight="semibold" style={{ fontSize: 14, color: on ? C.fg : C.muted, paddingBottom: 10, borderBottomWidth: 2, borderColor: on ? C.red : "transparent" }}>
                {TYPE_LABEL[tp]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flex: 1 }} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
        <ScrollView
          ref={scroll}
          accessibilityRole="adjustable"
          accessibilityLabel={t("Categorie")}
          accessibilityValue={{ text: selected?.label }}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={(e) => {
            const i = Math.max(0, Math.min(items.length - 1, index + (e.nativeEvent.actionName === "increment" ? 1 : -1)));
            setIndex(i);
            scroll.current?.scrollTo({ y: i * ITEM, animated: true });
          }}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={onScroll}
          contentContainerStyle={{ paddingVertical: pad }}
        >
          {items.map((c, i) => (
            <Pressable key={c.id} onPress={() => (i === index ? next(c.id) : scroll.current?.scrollTo({ y: i * ITEM, animated: true }))} style={{ height: ITEM, justifyContent: "center", paddingHorizontal: 24 }}>
              <Text style={{ fontFamily: F.medium, fontSize: i === index ? 34 : 29, letterSpacing: -0.6, color: i === index ? "#fff" : C.muted, opacity: i === index ? 1 : 0.3 }}>{c.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: pad, height: ITEM, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border }} />
        <LinearGradient pointerEvents="none" colors={[C.bg, "rgba(10,14,22,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: pad * 0.8 }} />
        <LinearGradient pointerEvents="none" colors={["rgba(10,14,22,0)", C.bg]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: pad * 0.8 }} />
      </View>

      <View style={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: insets.bottom + 16 }}>
        {selected?.welfare && <Text style={{ marginBottom: 12, textAlign: "center", fontSize: 12, color: C.cyan }}>{t("Dit is een hulpsignaal, geen waarschuwing. Twijfel je? Bel 112.")}</Text>}
        <Button red label={t("Verder")} onPress={() => selected && next(selected.id)} />
      </View>
    </View>
  );
}

