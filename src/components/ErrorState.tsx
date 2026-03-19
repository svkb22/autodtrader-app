import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { prudexTheme } from "@/theme/prudex";

type Props = {
  message: string;
  onRetry?: () => void;
};

export default function ErrorState({ message, onRetry }: Props): React.JSX.Element {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{message}</Text>
      {onRetry ? (
        <Pressable style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: prudexTheme.spacing.md,
    alignItems: "center",
    gap: prudexTheme.spacing.sm,
    borderRadius: prudexTheme.radius.md,
    borderWidth: 1,
    borderColor: prudexTheme.colors.border,
    backgroundColor: prudexTheme.colors.surface,
  },
  text: {
    color: prudexTheme.colors.textMuted,
    textAlign: "center",
  },
  button: {
    backgroundColor: prudexTheme.colors.primary,
    paddingHorizontal: prudexTheme.spacing.sm,
    paddingVertical: prudexTheme.spacing.xs,
    borderRadius: prudexTheme.radius.sm,
  },
  buttonText: {
    color: prudexTheme.colors.white,
    fontWeight: "600",
  },
});
