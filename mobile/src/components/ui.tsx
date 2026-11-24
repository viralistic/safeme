import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text as RNText, View, type PressableProps, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Svg, { Path } from "react-native-svg";
import { ICON_PATHS, type IconKey } from "@shared/icons";
import { t } from "@shared/i18n";
import { C, F, R } from "@/theme";

export function Text({ style, weight = "light", ...p }: TextProps & { weight?: keyof typeof F }) {
  return <RNText {...p} style={[{ color: C.fg, fontFamily: F[weight], fontSize: 15 }, style]} />;
}

export function Display({ children, size = 28, style }: { children: ReactNode; size?: number; style?: StyleProp<TextStyle> }) {
  return (
    <Text weight="medium" accessibilityRole="header" style={[{ fontSize: size, lineHeight: size * 1.06, letterSpacing: -0.03 * size }, style]}>
      {children}
    </Text>
  );
}

export function Eyebrow({ children, color = C.muted }: { children: ReactNode; color?: string }) {
  return (
    <Text weight="semibold" style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color }}>
      {children}
    </Text>
  );
}

export function Icon({ name, size = 20, color = C.fg, stroke = 2 }: { name: IconKey; size?: number; color?: string; stroke?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <Path d={ICON_PATHS[name]} />
    </Svg>
  );
}

/** Liquid glass, native: real blur behind, a glass tint, a bright top edge. */
export function Glass({ children, red, style, radius = R.sm }: { children?: ReactNode; red?: boolean; style?: StyleProp<ViewStyle>; radius?: number }) {
  return (
    <View style={[{ borderRadius: radius, overflow: "hidden", borderWidth: 1, borderColor: red ? "rgba(255,170,160,0.35)" : "rgba(255,255,255,0.18)" }, style]}>
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={red ? ["rgba(239,66,54,0.72)", "rgba(185,42,33,0.62)"] : ["rgba(255,255,255,0.14)", "rgba(255,255,255,0.05)"]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient colors={["rgba(255,255,255,0.35)", "rgba(255,255,255,0)"]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 0.6 }} style={[StyleSheet.absoluteFill, { opacity: 0.35 }]} />
      <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.45)", position: "absolute", top: 0, left: 8, right: 8 }} />
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  red,
  disabled,
  icon,
  style,
  height = 52,
}: {
  label: string;
  onPress: () => void;
  red?: boolean;
  disabled?: boolean;
  icon?: IconKey;
  style?: StyleProp<ViewStyle>;
  height?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [{ opacity: disabled ? 0.5 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}
    >
      <Glass red={red} style={{ height, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 9 }}>
        {icon && <Icon name={icon} size={17} />}
        <Text weight="semibold" style={{ fontSize: 14, color: "#fff" }}>
          {label}
        </Text>
      </Glass>
    </Pressable>
  );
}

export function Ghost({ label, onPress, color = C.muted, disabled }: { label: string; onPress: () => void; color?: string; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => ({ height: 44, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.4 : pressed ? 0.6 : 1 })}>
      <Text weight="medium" style={{ color, fontSize: 14 }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Chip({ icon, onPress, label, size = 44 }: { icon: IconKey; onPress: () => void; label: string; size?: number } & Omit<PressableProps, "children">) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border }}>
        <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,13,20,0.55)" }]} />
        <Icon name={icon} size={17} />
      </View>
    </Pressable>
  );
}

export function Note112({ style }: { style?: StyleProp<TextStyle> }) {
  return (
    <Text style={[{ textAlign: "center", fontSize: 11, color: C.muted }, style]}>
      {t("Bij nood: bel altijd")} <Text weight="semibold" style={{ fontSize: 11 }}>112</Text>
    </Text>
  );
}

/** A segmented choice: one row of equal buttons. */
export function Segments<T extends string | number>({ options, value, onChange, label }: { options: { v: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: "row", gap: 8 }}>
      {options.map((o) => {
        const on = o.v === value;
        return (
          <Pressable
            key={String(o.v)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(o.v)}
            style={{ flex: 1, height: 44, borderRadius: R.sm, borderWidth: 1, alignItems: "center", justifyContent: "center", borderColor: on ? "rgba(255,170,160,0.35)" : C.border, backgroundColor: on ? "rgba(237,58,44,0.22)" : C.surface }}
          >
            <Text weight="medium" style={{ fontSize: 13, color: on ? "#fff" : C.muted }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Row({ icon, term, value }: { icon: IconKey; term: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: C.border }}>
      <Icon name={icon} size={16} color={C.muted} />
      <Text style={{ flex: 1, color: C.muted, fontSize: 14 }}>{term}</Text>
      <Text weight="medium" style={{ fontSize: 14 }}>
        {value}
      </Text>
    </View>
  );
}
