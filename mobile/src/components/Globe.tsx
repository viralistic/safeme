// The rotating contour globe from the design, done natively: the texture
// scrolls inside a circle, with shading, a halo and pulsing hotspots.
import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";
import { C } from "@/theme";

const tex = require("../../assets/img/globe-tex.jpg");

function Hotspot({ x, y, delay }: { x: number; y: number; delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), -1));
  }, []);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: 1 + p.value * 2.6 }], opacity: 0.5 * (1 - p.value) }));
  return (
    <View style={{ position: "absolute", left: x, top: y, width: 10, height: 10 }}>
      <Animated.View style={[{ position: "absolute", width: 10, height: 10, borderRadius: 5, backgroundColor: C.red }, ring]} />
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.red, shadowColor: C.red, shadowOpacity: 0.9, shadowRadius: 8 }} />
    </View>
  );
}

export default function Globe({ size }: { size: number }) {
  const x = useSharedValue(0);
  const w = size * 2;
  useEffect(() => {
    x.value = withRepeat(withTiming(-w, { duration: 34000, easing: Easing.linear }), -1);
  }, [w]);
  const spin = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={{ width: size, height: size }}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: size, shadowColor: "#1f78dc", shadowOpacity: 0.55, shadowRadius: 60 }]} />
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", borderWidth: 1, borderColor: "rgba(56,210,255,0.25)", backgroundColor: "#06101f" }}>
        <Animated.View style={[{ flexDirection: "row", width: w * 2, height: size }, spin]}>
          <Image source={tex} style={{ width: w, height: size }} resizeMode="cover" />
          <Image source={tex} style={{ width: w, height: size }} resizeMode="cover" />
        </Animated.View>
        <LinearGradient colors={["rgba(90,175,255,0.22)", "rgba(7,11,18,0)"]} start={{ x: 0.2, y: 0.1 }} end={{ x: 0.6, y: 0.6 }} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={["rgba(7,11,18,0)", "rgba(7,11,18,0.85)"]} start={{ x: 0.4, y: 0.4 }} end={{ x: 0.9, y: 0.95 }} style={StyleSheet.absoluteFill} />
        <Hotspot x={size * 0.42} y={size * 0.3} delay={0} />
        <Hotspot x={size * 0.24} y={size * 0.55} delay={900} />
        <Hotspot x={size * 0.6} y={size * 0.48} delay={1600} />
      </View>
    </View>
  );
}
