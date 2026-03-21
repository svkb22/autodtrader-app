import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import BrandBackdrop from "@/components/BrandBackdrop";
import BrandLockup from "@/components/BrandLockup";
import { prudexTheme } from "@/theme/prudex";

export default function Loading(): React.JSX.Element {
  return (
    <View style={styles.wrap}>
      <BrandBackdrop />
      <BrandLockup variant="hero" showTagline animate />
      <ActivityIndicator size="small" color={prudexTheme.colors.primarySoft} />
      <Text style={styles.text}>Preparing system state...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: prudexTheme.colors.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: prudexTheme.spacing.md,
    padding: prudexTheme.spacing.lg,
  },
  text: {
    color: prudexTheme.colors.textSubtle,
    fontSize: prudexTheme.typography.body,
    fontWeight: "600",
  },
});
