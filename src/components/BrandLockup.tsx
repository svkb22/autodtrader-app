import React from "react";
import { Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { prudexTheme } from "@/theme/prudex";

type Props = {
  variant?: "hero" | "header" | "compact";
  showTagline?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  symbolStyle?: StyleProp<ImageStyle>;
};

const fullLockup = require("@/../assets/branding/falcon-logo-full.png");
const symbol = require("@/../assets/branding/falcon-symbol-512.png");

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
      <Image
        source={isCompact ? symbol : fullLockup}
        resizeMode="contain"
        style={[
          isCompact ? styles.symbol : styles.lockup,
          isHero && !isCompact && styles.lockupHero,
          isCompact && styles.symbolCompact,
          isCompact && symbolStyle,
        ]}
      />
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
    width: 208,
    height: 58,
  },
  lockupHero: {
    width: 280,
    height: 78,
  },
  symbol: {
    width: 34,
    height: 34,
  },
  symbolCompact: {
    width: 22,
    height: 22,
  },
});
