import React from "react";
import { Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { prudexTheme } from "@/theme/prudex";

type Props = {
  variant?: "hero" | "header" | "compact";
  showTagline?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  symbolStyle?: StyleProp<ImageStyle>;
};

const fullLockupPrimary = require("@/../assets/branding/prudex-full-lockup-primary.png");
const darkLockup = require("@/../assets/branding/prudex-lockup-dark.png");
const symbol = require("@/../assets/branding/prudex-symbol-exact-512.png");

export default function BrandLockup({
  variant = "hero",
  showTagline = false,
  containerStyle,
  symbolStyle,
}: Props): React.JSX.Element {
  const isHero = variant === "hero";
  const isCompact = variant === "compact";
  const usesLockup = !isCompact;

  return (
    <View style={[styles.row, isHero && styles.rowHero, containerStyle]}>
      {usesLockup ? (
        <Image
          source={isHero ? fullLockupPrimary : darkLockup}
          resizeMode="contain"
          style={[styles.lockup, isHero && styles.lockupHero]}
        />
      ) : (
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
      )}
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
  lockup: {
    width: 176,
    height: 60,
  },
  lockupHero: {
    width: 250,
    height: 70,
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
});
