import React, { useEffect, useMemo, useRef } from "react";
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { prudexTheme } from "@/theme/prudex";

type Props = {
  variant?: "hero" | "header" | "compact";
  showTagline?: boolean;
  animate?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

const LETTERS = "FALCON".split("");

export default function BrandLockup({
  variant = "hero",
  showTagline = false,
  animate = false,
  containerStyle,
}: Props): React.JSX.Element {
  const isHero = variant === "hero";
  const isCompact = variant === "compact";
  const letterValues = useRef(LETTERS.map(() => new Animated.Value(animate ? 0 : 1))).current;
  const taglineValue = useRef(new Animated.Value(animate ? 0 : 1)).current;

  useEffect(() => {
    if (!animate) {
      letterValues.forEach((value) => value.setValue(1));
      taglineValue.setValue(1);
      return;
    }

    const sequence = Animated.sequence([
      Animated.stagger(
        70,
        letterValues.map((value) =>
          Animated.timing(value, {
            toValue: 1,
            duration: 260,
            useNativeDriver: false,
          }),
        ),
      ),
      Animated.timing(taglineValue, {
        toValue: 1,
        duration: 240,
        useNativeDriver: false,
      }),
    ]);

    sequence.start();
  }, [animate, letterValues, taglineValue]);

  const renderedLetters = useMemo(
    () =>
      LETTERS.map((letter, index) => (
        <Animated.Text
          key={`${letter}-${index}`}
          style={[
            styles.wordmark,
            isHero && styles.wordmarkHero,
            isCompact && styles.wordmarkCompact,
            animate
              ? {
                  color: letterValues[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [prudexTheme.colors.textSubtle, prudexTheme.colors.text],
                  }),
                  opacity: letterValues[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.32, 1],
                  }),
                }
              : null,
          ]}
        >
          {letter}
        </Animated.Text>
      )),
    [animate, isCompact, isHero, letterValues],
  );

  return (
    <View style={[styles.stack, isHero && styles.stackHero, containerStyle]}>
      <View style={styles.wordmarkRow}>{renderedLetters}</View>
      {showTagline && !isCompact ? (
        <Animated.Text
          style={[
            styles.tagline,
            animate
              ? {
                  opacity: taglineValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                }
              : null,
          ]}
        >
          EXECUTE WITH DISCIPLINE.
        </Animated.Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    alignItems: "flex-start",
    gap: 4,
  },
  stackHero: {
    alignItems: "flex-start",
  },
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "center",
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
    paddingLeft: 1,
  },
});
