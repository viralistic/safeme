// Opens the call screen when a fake call is due, also when the person taps the
// ringing notification after the app was in the background.
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@shared/i18n";
import { cancelCall, onCallEvent, pendingCall } from "@/lib/fakecall";
import { Text } from "./ui";
import { C } from "@/theme";

Notifications.setNotificationHandler({
  // The app shows its own call screen when it is open: no banner on top of it.
  handleNotification: async (n) => {
    const fake = !!n.request.content.data?.fakecall;
    return { shouldShowBanner: !fake, shouldShowList: !fake, shouldPlaySound: !fake, shouldSetBadge: false };
  },
});

export default function CallWatcher() {
  const insets = useSafeAreaInsets();
  const [waiting, setWaiting] = useState(!!pendingCall());

  useEffect(() => {
    const off = onCallEvent((ringId, p) => {
      setWaiting(!!p);
      if (ringId) router.push({ pathname: "/call", params: { id: ringId } });
    });
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const id = res.notification.request.content.data?.fakecall;
      if (typeof id === "string") router.push({ pathname: "/call", params: { id, answered: "1" } });
    });
    return () => {
      off();
      sub.remove();
    };
  }, []);

  if (!waiting) return null;
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", top: insets.top + 64, left: 0, right: 0, alignItems: "center" }}>
      <Pressable accessibilityRole="button" onPress={() => void cancelCall()} style={{ borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: "rgba(10,13,20,0.9)", paddingHorizontal: 16, paddingVertical: 9 }}>
        <Text style={{ fontSize: 12, color: C.soft }}>{t("Gesprek komt eraan · tik om te annuleren")}</Text>
      </Pressable>
    </View>
  );
}
