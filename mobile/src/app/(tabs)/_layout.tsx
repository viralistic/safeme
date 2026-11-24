import { Redirect, Tabs } from "expo-router";
import { t } from "@shared/i18n";
import { Icon } from "@/components/ui";
import { useApp } from "@/state";
import { C, F } from "@/theme";

export default function TabsLayout() {
  const { onboarded } = useApp();
  if (!onboarded) return <Redirect href="/start" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.red,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: { backgroundColor: "rgba(7,10,17,0.96)", borderTopColor: C.border },
        tabBarLabelStyle: { fontFamily: F.medium, fontSize: 10 },
        sceneStyle: { backgroundColor: C.page },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("Kaart"), tabBarIcon: ({ color }) => <Icon name="map" size={21} color={String(color)} /> }} />
      <Tabs.Screen name="meldingen" options={{ title: t("Meldingen"), tabBarIcon: ({ color }) => <Icon name="bell" size={21} color={String(color)} /> }} />
      <Tabs.Screen name="jij" options={{ title: t("Jij"), tabBarIcon: ({ color }) => <Icon name="user" size={21} color={String(color)} /> }} />
    </Tabs>
  );
}
