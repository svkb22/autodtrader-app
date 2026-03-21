import React from "react";
import { ImageStyle, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { prudexTheme } from "@/theme/prudex";

type Props = {
  variant?: "hero" | "header" | "compact";
  showTagline?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  symbolStyle?: StyleProp<ImageStyle>;
};

export default function BrandLockup({
  variant = "hero",
  showTagline = false,
  containerStyle,
  symbolStyle,
}: Props): React.JSX.Element {
  const isHero = variant === "hero";
  const isCompact = variant === "compact";
  void showTagline;

  return (
    <View style={[styles.row, isHero && styles.rowHero, containerStyle]}>
      <Text
        style={[
          styles.wordmark,
          isHero && styles.wordmarkHero,
          isCompact && styles.wordmarkCompact,
          symbolStyle,
        ]}
      >
        FALCON
      </Text>
      {showTagline && !isCompact ? <Text style={styles.tagline}>EXECUTE WITH DISCIPLINE.</Text> : null}
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
  wordmark: {
    color: prudexTheme.colors.text,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 3.6,
  },
  wordmarkHero: {
    fontSize: 42,
    letterSpacing: 4.8,
  },
  wordmarkCompact: {
    fontSize: 16,
    letterSpacing: 2.2,
  },
  tagline: {
    color: prudexTheme.colors.textSubtle,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2.4,
  },
});
