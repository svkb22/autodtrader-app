import React from "react";
import { Image, ImageStyle, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { prudexTheme } from "@/theme/prudex";

type Props = {
  variant?: "hero" | "header" | "compact";
  showTagline?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  symbolStyle?: StyleProp<ImageStyle>;
};

const symbol = require("@/../assets/branding/prudex-symbol-512.png");

export default function BrandLockup({
  variant = "hero",
  showTagline = false,
  containerStyle,
  symbolStyle,
}: Props): React.JSX.Element {
  const isHero = variant === "hero";
  const isCompact = variant === "compact";

  return (
    <View style={[styles.row, isHero && styles.rowHero, containerStyle]}>
      <Image
        source={symbol}
        resizeMode="contain"
        style={[
          styles.symbol,
          isHero && styles.symbolHero,
          isCompact && styles.symbolCompact,
          symbolStyle,
        ]}
      />
      <View style={styles.copy}>
        <Text style={[styles.wordmark, isHero && styles.wordmarkHero, isCompact && styles.wordmarkCompact]}>PRUDEX</Text>
        {showTagline ? <Text style={styles.tagline}>Execute with discipline.</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: prudexTheme.spacing.sm,
  },
  rowHero: {
    alignItems: "flex-start",
    gap: prudexTheme.spacing.md,
  },
  symbol: {
    width: 32,
    height: 32,
  },
  symbolHero: {
    width: 56,
    height: 56,
  },
  symbolCompact: {
    width: 22,
    height: 22,
  },
  copy: {
    gap: 2,
  },
  wordmark: {
    color: prudexTheme.colors.text,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2.4,
  },
  wordmarkHero: {
    fontSize: 26,
    letterSpacing: 3.4,
  },
  wordmarkCompact: {
    fontSize: 14,
    letterSpacing: 2,
  },
  tagline: {
    color: prudexTheme.colors.textSubtle,
    fontSize: 13,
    fontWeight: "600",
  },
});
