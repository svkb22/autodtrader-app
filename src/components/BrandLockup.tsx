import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { prudexTheme } from "@/theme/prudex";

type Props = {
  variant?: "hero" | "header" | "compact";
  showTagline?: boolean;
  animate?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

const mark = require("@/../assets/branding/falcun-mark-1024.png");

export default function BrandLockup({
  variant = "hero",
  showTagline = false,
  animate = false,
  containerStyle,
}: Props): React.JSX.Element {
  const isHero = variant === "hero";
  const isCompact = variant === "compact";
  const opacity = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const translateY = useRef(new Animated.Value(animate ? 8 : 0)).current;

  useEffect(() => {
    if (!animate) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();
  }, [animate, opacity, translateY]);

  return (
    <Animated.View
      style={[
        styles.stack,
        isHero && styles.stackHero,
        containerStyle,
        animate ? { opacity, transform: [{ translateY }] } : null,
      ]}
    >
      <Image source={mark} resizeMode="contain" style={[styles.mark, isHero && styles.markHero, isCompact && styles.markCompact]} />
      {showTagline && !isCompact ? <Text style={styles.tagline}>EXECUTE WITH DISCIPLINE.</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stack: {
    alignItems: "flex-start",
    gap: 10,
  },
  stackHero: {
    alignItems: "center",
  },
  mark: {
    width: 126,
    height: 126,
  },
  markHero: {
    width: 210,
    height: 210,
  },
  markCompact: {
    width: 48,
    height: 48,
  },
  tagline: {
    color: prudexTheme.colors.textSubtle,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2.4,
    textAlign: "center",
    alignSelf: "center",
  },
});
