import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { NavigationProp, ParamListBase, useNavigation } from "@react-navigation/native";

import { AutoExecuteStrength, BrokerSettings } from "@/api/types";
import { getBrokerSettings, toApiError, updateBrokerSettings } from "@/api/client";
import BrandBackdrop from "@/components/BrandBackdrop";
import BrandLockup from "@/components/BrandLockup";
import { prudexTheme } from "@/theme/prudex";

const options: Array<{ key: AutoExecuteStrength; label: string }> = [
  { key: "strong_only", label: "Strong only" },
  { key: "strong_medium", label: "Strong + Medium" },
  { key: "all", label: "All" },
];

export default function AutoExecuteSettingsScreen(): React.JSX.Element {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [settings, setSettings] = useState<BrokerSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getBrokerSettings()
      .then(setSettings)
      .catch((error) => Alert.alert("Load failed", toApiError(error)));
  }, []);

  const onSave = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      const updated = await updateBrokerSettings(settings);
      setSettings(updated);
      Alert.alert("Saved", "Auto-execution settings updated.", [
        {
          text: "OK",
          onPress: () => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("Tabs");
            }
          },
        },
      ]);
    } catch (error) {
      Alert.alert("Save failed", toApiError(error));
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BrandBackdrop />
      <BrandLockup variant="header" />
      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.label}>Auto Execution</Text>
          <Text style={styles.help}>If enabled, eligible setups can route orders automatically within guardrails.</Text>
        </View>
        <Switch
          value={settings.auto_execute_enabled}
          onValueChange={(value) => setSettings((prev) => (prev ? { ...prev, auto_execute_enabled: value } : prev))}
        />
      </View>

      <Text style={styles.label}>Strength Tier</Text>
      <View style={styles.optionList}>
        {options.map((option) => {
          const active = settings.auto_execute_strength === option.key;
          return (
            <Pressable
              key={option.key}
              style={[styles.option, active && styles.optionActive]}
              onPress={() => setSettings((prev) => (prev ? { ...prev, auto_execute_strength: option.key } : prev))}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.safeguards}>
        <Text style={styles.safeguardTitle}>Safeguards</Text>
        <Text style={styles.safeguardItem}>• Every trade is still created as a proposal for audit trail.</Text>
        <Text style={styles.safeguardItem}>• Entry uses limit + bracket stop/target with risk checks.</Text>
        <Text style={styles.safeguardItem}>• Idempotency prevents duplicate submissions for the same proposal.</Text>
      </View>

      <Pressable style={[styles.saveButton, saving && styles.disabled]} disabled={saving} onPress={onSave}>
        <Text style={styles.saveText}>{saving ? "Saving..." : "Save Settings"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: prudexTheme.colors.bg, padding: 16, gap: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { color: prudexTheme.colors.textSubtle },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: prudexTheme.colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: prudexTheme.colors.border,
  },
  rowText: { flex: 1, paddingRight: 10 },
  label: { color: prudexTheme.colors.text, fontSize: 16, fontWeight: "700" },
  help: { color: prudexTheme.colors.textSubtle, marginTop: 4 },
  optionList: { gap: 8 },
  option: {
    backgroundColor: prudexTheme.colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: prudexTheme.colors.borderStrong,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  optionActive: {
    borderColor: prudexTheme.colors.primary,
    backgroundColor: prudexTheme.colors.surfaceMuted,
  },
  optionText: { color: prudexTheme.colors.textMuted, fontWeight: "600" },
  optionTextActive: { color: prudexTheme.colors.primarySoft },
  safeguards: {
    backgroundColor: prudexTheme.colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: prudexTheme.colors.border,
    padding: 12,
    gap: 4,
  },
  safeguardTitle: { color: prudexTheme.colors.text, fontWeight: "700" },
  safeguardItem: { color: prudexTheme.colors.textMuted },
  saveButton: {
    backgroundColor: prudexTheme.colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveText: { color: prudexTheme.colors.white, fontWeight: "700" },
  disabled: { opacity: 0.5 },
});
