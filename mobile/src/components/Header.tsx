import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@shared/i18n";
import { Chip, Display } from "./ui";

export default function Header({ title, onBack, onClose, size = 28 }: { title: ReactNode; onBack?: () => void; onClose?: () => void; size?: number }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 22, paddingBottom: 4, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, flex: 1 }}>
        {onBack && <Chip icon="back" label={t("Terug")} onPress={onBack} />}
        <View style={{ flex: 1, paddingTop: onBack ? 6 : 0 }}>
          <Display size={size}>{title}</Display>
        </View>
      </View>
      {onClose && <Chip icon="close" label={t("Sluiten")} onPress={onClose} />}
    </View>
  );
}
