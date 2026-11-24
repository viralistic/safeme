import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { AppProvider } from "@/state";
import { C } from "@/theme";

void SplashScreen.preventAutoHideAsync();

export default function Root() {
  const [loaded] = useFonts({
    "Geist-Light": require("../../assets/fonts/Geist-Light.ttf"),
    "Geist-Regular": require("../../assets/fonts/Geist-Regular.ttf"),
    "Geist-Medium": require("../../assets/fonts/Geist-Medium.ttf"),
    "Geist-SemiBold": require("../../assets/fonts/Geist-SemiBold.ttf"),
  });
  useEffect(() => {
    if (loaded) void SplashScreen.hideAsync();
  }, [loaded]);
  if (!loaded) return null;

  return (
    <AppProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.page }, animation: "slide_from_right" }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="start" options={{ presentation: "fullScreenModal", gestureEnabled: false, animation: "fade" }} />
        <Stack.Screen name="melden" options={{ presentation: "modal" }} />
        <Stack.Screen name="ernst" />
        <Stack.Screen name="verzonden" options={{ gestureEnabled: false, animation: "fade" }} />
        <Stack.Screen name="melding/[id]" />
        <Stack.Screen name="bellen/index" />
        <Stack.Screen name="bellen/[id]" />
        <Stack.Screen name="bel-me" options={{ presentation: "formSheet", sheetAllowedDetents: [0.72, 1], sheetGrabberVisible: true }} />
        <Stack.Screen name="call" options={{ presentation: "fullScreenModal", gestureEnabled: false, animation: "fade" }} />
      </Stack>
    </AppProvider>
  );
}
