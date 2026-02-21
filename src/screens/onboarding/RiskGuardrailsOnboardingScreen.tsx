import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { track } from "@/analytics/track";
import { updateRisk } from "@/api/client";
import { useOnboarding } from "@/onboarding/OnboardingContext";
import { parseNumericInput, validateRiskDraft } from "@/onboarding/riskValidation";
import { RiskDraft } from "@/onboarding/types";
import OnboardingLayout from "@/screens/onboarding/OnboardingLayout";

type Props = {
  navigation: { goBack: () => void; navigate: (route: "Notifications") => void };
};

export default function RiskGuardrailsOnboardingScreen({ navigation }: Props): React.JSX.Element {
  const { draft, setRiskDraft, setRiskConfigured } = useOnboarding();
  const [capitalMode, setCapitalMode] = useState<"usd" | "pct">(draft.riskDraft.capital_limit_mode);
  const [capitalValue, setCapitalValue] = useState<string>(String(draft.riskDraft.capital_limit_value));
  const [maxDailyLoss, setMaxDailyLoss] = useState<string>(String(draft.riskDraft.max_daily_loss_usd));
  const [maxTrades, setMaxTrades] = useState<string>(String(draft.riskDraft.max_trades_per_day));
  const [autoApprove, setAutoApprove] = useState<boolean>(draft.riskDraft.auto_approve_enabled);
  const [saveError, setSaveError] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    track("onboarding_step_viewed", { step: "risk_guardrails" });
  }, []);

  const parsedDraft = useMemo<RiskDraft>(
    () => ({
      capital_limit_mode: capitalMode,
      capital_limit_value: parseNumericInput(capitalValue),
      max_daily_loss_usd: parseNumericInput(maxDailyLoss),
      max_trades_per_day: Math.round(parseNumericInput(maxTrades)),
      auto_approve_enabled: autoApprove,
      auto_approve_mode: autoApprove ? "strong_only" : "off",
    }),
    [autoApprove, capitalMode, capitalValue, maxDailyLoss, maxTrades]
  );

  const validation = validateRiskDraft(parsedDraft);
  const maxExposureLabel =
    capitalMode === "usd"
      ? `$${Number.isFinite(parsedDraft.capital_limit_value) ? parsedDraft.capital_limit_value.toFixed(0) : "0"}`
      : `${Number.isFinite(parsedDraft.capital_limit_value) ? (parsedDraft.capital_limit_value * 100).toFixed(0) : "0"}% of equity`;

  const onSave = async () => {
    setSaveError("");
    const validated = validateRiskDraft(parsedDraft);
    if (!validated.valid) {
      setSaveError(validated.message ?? "Invalid inputs.");
      return;
    }

    try {
      setSaving(true);
      await updateRisk({
        capital_limit_mode: parsedDraft.capital_limit_mode,
        capital_limit_value: parsedDraft.capital_limit_value,
        max_daily_loss_usd: parsedDraft.max_daily_loss_usd,
        max_trades_per_day: parsedDraft.max_trades_per_day,
        risk_per_trade_usd: Math.max(5, Math.round(parsedDraft.max_daily_loss_usd / 2)),
        max_notional_pct: capitalMode === "pct" ? Math.min(1, parsedDraft.capital_limit_value) : 1,
        kill_switch_enabled: false,
      });
      setRiskDraft(parsedDraft);
      setRiskConfigured(true);
      track("risk_saved", {
        max_daily_loss: parsedDraft.max_daily_loss_usd,
        max_trades_per_day: parsedDraft.max_trades_per_day,
        capital_limit_mode: parsedDraft.capital_limit_mode,
        capital_limit_value: parsedDraft.capital_limit_value,
        auto_approve_mode: parsedDraft.auto_approve_mode,
      });
      track("onboarding_step_completed", { step: "risk_guardrails" });
      navigation.navigate("Notifications");
    } catch {
      setRiskConfigured(false);
      setSaveError("Couldn’t save right now. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingLayout
      step={4}
      totalSteps={7}
      title="Set your risk limits"
      subtitle="The system will never exceed these."
      primaryLabel={saving ? "Saving..." : "Save & Continue"}
      onPrimary={onSave}
      primaryDisabled={saving || !validation.valid}
      secondaryLabel="Back"
      onSecondary={navigation.goBack}
    >
      <View style={styles.card}>
        <Text style={styles.label}>Capital allocation mode</Text>
        <View style={styles.row}>
          <Pressable
            accessibilityLabel="Capital mode USD"
            style={[styles.pill, capitalMode === "usd" && styles.activePill]}
            onPress={() => setCapitalMode("usd")}
          >
            <Text style={[styles.pillText, capitalMode === "usd" && styles.activePillText]}>USD</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Capital mode Percent"
            style={[styles.pill, capitalMode === "pct" && styles.activePill]}
            onPress={() => setCapitalMode("pct")}
          >
            <Text style={[styles.pillText, capitalMode === "pct" && styles.activePillText]}>%</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>{capitalMode === "usd" ? "Capital value ($)" : "Capital value (0-1)"}</Text>
        <TextInput style={styles.input} value={capitalValue} onChangeText={setCapitalValue} keyboardType="numeric" />

        <Text style={styles.label}>Max daily loss ($)</Text>
        <TextInput style={styles.input} value={maxDailyLoss} onChangeText={setMaxDailyLoss} keyboardType="numeric" />

        <Text style={styles.label}>Max trades/day</Text>
        <TextInput style={styles.input} value={maxTrades} onChangeText={setMaxTrades} keyboardType="numeric" />

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.label}>Auto-approve</Text>
            <Text style={styles.helper}>Strong setups only</Text>
          </View>
          <Switch value={autoApprove} onValueChange={setAutoApprove} />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLine}>Max exposure: {maxExposureLabel}</Text>
          <Text style={styles.summaryLine}>Max daily loss: ${Number.isFinite(parsedDraft.max_daily_loss_usd) ? parsedDraft.max_daily_loss_usd.toFixed(0) : "0"}</Text>
          <Text style={styles.summaryLine}>Trades/day: {Number.isFinite(parsedDraft.max_trades_per_day) ? parsedDraft.max_trades_per_day : 1}</Text>
        </View>

        {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
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
  label: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "600",
  },
  helper: {
    fontSize: 12,
    color: "#64748b",
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  pill: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  activePill: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },
  pillText: {
    color: "#334155",
    fontWeight: "600",
  },
  activePillText: {
    color: "white",
  },
  input: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 12,
    backgroundColor: "white",
  },
  switchRow: {
    minHeight: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryCard: {
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    gap: 4,
  },
  summaryLine: {
    color: "#0f172a",
    fontSize: 13,
  },
  error: {
    color: "#b91c1c",
    fontSize: 13,
  },
});
