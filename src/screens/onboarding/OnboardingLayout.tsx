import React, { PropsWithChildren } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import BrandLockup from "@/components/BrandLockup";
import { prudexTheme } from "@/theme/prudex";

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
        <BrandLockup variant="compact" />
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
    backgroundColor: prudexTheme.colors.bg,
  },
  progressRow: {
    paddingTop: prudexTheme.spacing.md,
    paddingHorizontal: prudexTheme.spacing.md,
    gap: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: prudexTheme.colors.textSubtle,
    fontWeight: "600",
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: prudexTheme.colors.border,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    backgroundColor: prudexTheme.colors.primarySoft,
  },
  scrollContent: {
    padding: prudexTheme.spacing.md,
    gap: 12,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "600",
    color: prudexTheme.colors.text,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: prudexTheme.colors.textMuted,
  },
  footer: {
    padding: prudexTheme.spacing.md,
    gap: 10,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: prudexTheme.radius.md,
    backgroundColor: prudexTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: prudexTheme.colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: prudexTheme.radius.md,
    borderWidth: 1,
    borderColor: prudexTheme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: prudexTheme.colors.surface,
  },
  secondaryButtonText: {
    color: prudexTheme.colors.textMuted,
    fontSize: 15,
    fontWeight: "600",
  },
  tertiaryButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  tertiaryButtonText: {
    color: prudexTheme.colors.textSubtle,
    fontSize: 13,
    fontWeight: "600",
  },
});
