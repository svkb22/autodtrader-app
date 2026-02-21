import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { track } from "@/analytics/track";
import { activateSystem } from "@/api/client";
import { useOnboarding } from "@/onboarding/OnboardingContext";
import OnboardingLayout from "@/screens/onboarding/OnboardingLayout";

type Props = {
  navigation: { goBack: () => void };
};

export default function ReviewActivateScreen({ navigation }: Props): React.JSX.Element {
  const { draft, markCompleted } = useOnboarding();
  const [agreed, setAgreed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>("");

  useEffect(() => {
    track("onboarding_step_viewed", { step: "review_activate" });
  }, []);

  const modeLabel = draft.mode === "paper" ? "Paper" : "Live";

  const capitalLabel = useMemo(() => {
    if (draft.riskDraft.capital_limit_mode === "usd") {
      return `$${draft.riskDraft.capital_limit_value.toFixed(0)}`;
    }
    return `${(draft.riskDraft.capital_limit_value * 100).toFixed(0)}%`;
  }, [draft.riskDraft.capital_limit_mode, draft.riskDraft.capital_limit_value]);

  const activateLabel = draft.mode === "paper" ? "Activate Paper Mode" : "Activate Live Mode";

  const onActivate = async () => {
    setErrorText("");
    try {
      setLoading(true);
      await activateSystem(draft.mode, {
        broker_mode: draft.mode,
        risk: draft.riskDraft,
        notifications_status: draft.notificationsStatus,
      });
      track("onboarding_activated", { mode: draft.mode });
      await markCompleted(draft.mode);
      track("onboarding_completed");
      track("onboarding_step_completed", { step: "review_activate" });
    } catch {
      setErrorText("Couldn’t activate right now. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout
      step={7}
      totalSteps={7}
      title="Review"
      primaryLabel={loading ? "Activating..." : activateLabel}
      onPrimary={onActivate}
      primaryDisabled={!agreed || loading}
      secondaryLabel="Back"
      onSecondary={navigation.goBack}
    >
      <View style={styles.card}>
        <Text style={styles.row}>Broker: Connected ({modeLabel})</Text>
        <Text style={styles.row}>Capital allocation: {capitalLabel}</Text>
        <Text style={styles.row}>Max daily loss: ${draft.riskDraft.max_daily_loss_usd.toFixed(0)}</Text>
        <Text style={styles.row}>Trades/day: {draft.riskDraft.max_trades_per_day}</Text>
        <Text style={styles.row}>Auto-approve: {draft.riskDraft.auto_approve_enabled ? "Strong only" : "Off"}</Text>
        <Text style={styles.row}>Notifications: {draft.notificationsStatus}</Text>

        <Pressable accessibilityLabel="Acknowledge risk statement" style={styles.checkboxRow} onPress={() => setAgreed((prev) => !prev)}>
          <View style={[styles.checkbox, agreed && styles.checkboxActive]}>{agreed ? <Text style={styles.checkboxTick}>✓</Text> : null}</View>
          <Text style={styles.checkboxText}>I understand this system does not guarantee profits.</Text>
        </Pressable>
        {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    gap: 10,
  },
  row: {
    color: "#0f172a",
    fontSize: 14,
  },
  checkboxRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  checkbox: {
    marginTop: 2,
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },
  checkboxTick: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  checkboxText: {
    flex: 1,
    color: "#334155",
    fontSize: 13,
    lineHeight: 18,
  },
  error: {
    color: "#b91c1c",
    fontSize: 13,
  },
});
