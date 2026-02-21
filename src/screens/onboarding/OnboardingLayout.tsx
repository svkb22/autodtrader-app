import React, { PropsWithChildren } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type Props = PropsWithChildren<{
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  tertiaryLabel?: string;
  onTertiary?: () => void;
}>;

export default function OnboardingLayout({
  step,
  totalSteps,
  title,
  subtitle,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  secondaryLabel,
  onSecondary,
  tertiaryLabel,
  onTertiary,
  children,
}: Props): React.JSX.Element {
  const progress = Math.max(0, Math.min(1, step / totalSteps));

  return (
    <View style={styles.screen}>
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>{`Step ${step} of ${totalSteps}`}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {children}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityLabel={primaryLabel}
          style={[styles.primaryButton, primaryDisabled && styles.disabledButton]}
          onPress={onPrimary}
          disabled={primaryDisabled}
        >
          <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
        </Pressable>
        {secondaryLabel && onSecondary ? (
          <Pressable accessibilityLabel={secondaryLabel} style={styles.secondaryButton} onPress={onSecondary}>
            <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
          </Pressable>
        ) : null}
        {tertiaryLabel && onTertiary ? (
          <Pressable accessibilityLabel={tertiaryLabel} style={styles.tertiaryButton} onPress={onTertiary}>
            <Text style={styles.tertiaryButtonText}>{tertiaryLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  progressRow: {
    paddingTop: 16,
    paddingHorizontal: 16,
    gap: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    backgroundColor: "#0f172a",
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "600",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#475569",
  },
  footer: {
    padding: 16,
    gap: 10,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "600",
  },
  tertiaryButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  tertiaryButtonText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "600",
  },
});
