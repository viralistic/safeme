import { useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { lang, setLang, t } from "@shared/i18n";
import Header from "@/components/Header";
import { Button, Ghost, Icon, Note112, Segments, Text } from "@/components/ui";
import { WEB_URL } from "@/city";
import { clearScenarios } from "@/lib/fakecall";
import * as kv from "@/lib/kv";
import { useApp } from "@/state";
import { C, R } from "@/theme";
import type { IconKey } from "@shared/icons";

const RULES: { icon: IconKey; title: string; body: string }[] = [
  { icon: "pin", title: t("Je locatie wordt vervaagd"), body: t("Elke melding wordt afgerond op een vak van ongeveer 100 meter, voordat hij wordt opgeslagen.") },
  { icon: "user", title: t("Je blijft anoniem"), body: t("Geen naam, geen e-mail, geen telefoonnummer. Je toestel krijgt een willekeurige code.") },
  { icon: "lock", title: t("Omschrijvingen zijn niet openbaar"), body: t("Een notitie ziet alleen de moderatie. Op de kaart staan alleen categorie, ernst en tijd.") },
  { icon: "clock", title: t("Meldingen verdwijnen vanzelf"), body: t("Na een paar uur vervaagt een melding van de kaart. Na 30 dagen wissen we hem helemaal.") },
];

function LinkRow({ icon, title, body, onPress }: { icon: IconKey; title: string; body: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: R.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, padding: 16, opacity: pressed ? 0.8 : 1 })}>
      <Icon name={icon} size={18} color={C.cyan} />
      <View style={{ flex: 1 }}>
        <Text weight="medium" style={{ fontSize: 14 }}>
          {title}
        </Text>
        <Text style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{body}</Text>
      </View>
      <View style={{ transform: [{ rotate: "180deg" }] }}>
        <Icon name="back" size={16} color={C.muted} />
      </View>
    </Pressable>
  );
}

export default function Jij() {
  const { store } = useApp();
  const [sure, setSure] = useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={t("Jouw privacy")} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: 30, gap: 12 }}>
        {RULES.map((r, i) => (
          <View key={r.title} style={{ flexDirection: "row", gap: 14, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderColor: C.border }}>
            <Icon name={r.icon} size={18} color={C.cyan} />
            <View style={{ flex: 1 }}>
              <Text weight="medium" style={{ fontSize: 14 }}>
                {r.title}
              </Text>
              <Text style={{ marginTop: 3, fontSize: 13, color: C.muted, lineHeight: 18 }}>{r.body}</Text>
            </View>
          </View>
        ))}
        <LinkRow icon="phone" title={t("Nepgesprek instellen")} body={t("Kies wie er belt en neem hun stem op.")} onPress={() => router.push("/bellen")} />
        {WEB_URL ? <LinkRow icon="clock" title={t("Cijfers per maand")} body={t("Hoe rustig het is, zonder losse meldingen.")} onPress={() => Linking.openURL(`${WEB_URL}/cijfers`)} /> : null}
        <View style={{ borderRadius: R.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, padding: 16 }}>
          <Text weight="medium" style={{ fontSize: 14 }}>
            {t("Geen alarmdienst")}
          </Text>
          <Text style={{ marginTop: 4, fontSize: 13, color: C.muted, lineHeight: 18 }}>{t("Safety Map helpt je kiezen waar je langs loopt. Bij gevaar of een noodgeval bel je altijd 112. Geen spoed, wel politie? Bel 0900 8844.")}</Text>
        </View>
        <View style={{ gap: 10, paddingTop: 8 }}>
          <Text weight="medium" style={{ fontSize: 14 }}>
            {t("Taal")}
          </Text>
          <Segments label={t("Taal")} value={lang} onChange={(l) => l !== lang && setLang(l)} options={[{ v: "nl" as const, label: "Nederlands" }, { v: "en" as const, label: "English" }]} />
        </View>
        <View style={{ paddingTop: 12, gap: 6 }}>
          {sure ? (
            <>
              <Text style={{ textAlign: "center", fontSize: 13, color: C.muted }}>{t("Je instellingen, bevestigingen en code op dit toestel worden gewist.")}</Text>
              <Button
                red
                label={t("Ja, wis alles")}
                onPress={async () => {
                  await store.reset();
                  clearScenarios();
                  kv.clearAll();
                  setSure(false);
                  router.replace("/start");
                }}
              />
              <Ghost label={t("Annuleren")} onPress={() => setSure(false)} />
            </>
          ) : (
            <Button label={t("Wis mijn gegevens op dit toestel")} onPress={() => setSure(true)} />
          )}
        </View>
        <Text style={{ textAlign: "center", fontSize: 11, color: C.muted, marginTop: 8 }} onPress={() => Linking.openURL("https://github.com/viralistic/safeme")}>
          Safety Map is open source. {t("Bekijk de code")}
        </Text>
        <Note112 />
      </ScrollView>
    </View>
  );
}
