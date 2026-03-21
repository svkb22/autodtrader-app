import React from "react";
import { Image, StyleSheet, View } from "react-native";

import { prudexTheme } from "@/theme/prudex";

const glow = require("@/../assets/branding/prudex-gradient-flow.png");

export default function BrandBackdrop(): React.JSX.Element {
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View style={styles.base} />
      <Image source={glow} resizeMode="stretch" style={styles.glowTop} />
      <Image source={glow} resizeMode="stretch" style={styles.glowBottom} />
      <View style={styles.vignette} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: prudexTheme.colors.bg,
  },
  glowTop: {
    position: "absolute",
    top: -40,
    right: -90,
    width: 320,
    height: 180,
    opacity: 0.18,
  },
  glowBottom: {
    position: "absolute",
    bottom: -30,
    left: -50,
    width: 260,
    height: 140,
    opacity: 0.12,
    transform: [{ rotate: "180deg" }],
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3, 8, 12, 0.22)",
  },
});
