import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { getRisk, toApiError, updateRisk } from "@/api/client";

export default function RiskSettingsScreen(): JSX.Element {
  const [maxDailyLoss, setMaxDailyLoss] = useState<string>("150");
  const [riskPerTrade, setRiskPerTrade] = useState<string>("45");
  const [maxTrades, setMaxTrades] = useState<string>("1");
  const [maxNotionalPct, setMaxNotionalPct] = useState<string>("0.2");
  const [killSwitch, setKillSwitch] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    getRisk()
      .then((risk) => {
        setMaxDailyLoss(String(risk.max_daily_loss_usd));
        setRiskPerTrade(String(risk.risk_per_trade_usd));
        setMaxTrades(String(risk.max_trades_per_day));
        setMaxNotionalPct(String(risk.max_notional_pct));
        setKillSwitch(risk.kill_switch_enabled);
      })
      .catch((error) => Alert.alert("Load failed", toApiError(error)));
  }, []);

  const onSave = async () => {
    try {
      setLoading(true);
      await updateRisk({
        max_daily_loss_usd: Number(maxDailyLoss),
        risk_per_trade_usd: Number(riskPerTrade),
        max_trades_per_day: Number(maxTrades),
        max_notional_pct: Number(maxNotionalPct),
        kill_switch_enabled: killSwitch,
      });
      Alert.alert("Saved", "Risk settings updated.");
    } catch (error) {
      Alert.alert("Save failed", toApiError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Max Daily Loss (USD)</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={maxDailyLoss} onChangeText={setMaxDailyLoss} />

      <Text style={styles.label}>Risk Per Trade (USD)</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={riskPerTrade} onChangeText={setRiskPerTrade} />

      <Text style={styles.label}>Max Trades Per Day</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={maxTrades} onChangeText={setMaxTrades} />

      <Text style={styles.label}>Max Notional Pct</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={maxNotionalPct} onChangeText={setMaxNotionalPct} />

      <View style={styles.switchRow}>
        <Text style={styles.label}>Pause Trading</Text>
        <Switch value={killSwitch} onValueChange={setKillSwitch} />
      </View>

      <Pressable style={styles.button} onPress={onSave} disabled={loading}>
        <Text style={styles.buttonText}>Save Risk Settings</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10, backgroundColor: "#f8fafc" },
  label: { color: "#1f2937", fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "white",
  },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 6 },
  button: {
    marginTop: 8,
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "700" },
});
