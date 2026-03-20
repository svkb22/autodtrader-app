import React from "react";
import { Image, ImageStyle, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { prudexTheme } from "@/theme/prudex";

type Props = {
  variant?: "hero" | "header" | "compact";
  showTagline?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  symbolStyle?: StyleProp<ImageStyle>;
};

const symbol = require("@/../assets/branding/prudex-symbol-exact-512.png");
const BRAND_NAME = "FALCON";
const TAGLINE = "EXECUTE WITH DISCIPLINE.";

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
      {!isCompact ? (
        <View style={styles.wordmarkBlock}>
          <Text style={[styles.wordmark, isHero && styles.wordmarkHero]}>{BRAND_NAME}</Text>
          {showTagline ? <Text style={styles.tagline}>{TAGLINE}</Text> : null}
        </View>
      ) : null}
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
  },
  symbol: {
    width: 34,
    height: 34,
  },
  symbolHero: {
    width: 68,
    height: 68,
  },
  symbolCompact: {
    width: 22,
    height: 22,
  },
  wordmarkBlock: {
    gap: 2,
  },
  wordmark: {
    color: prudexTheme.colors.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 3.2,
  },
  wordmarkHero: {
    fontSize: 40,
    letterSpacing: 4.4,
  },
  tagline: {
    color: prudexTheme.colors.textSubtle,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2.4,
  },
});
