import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { getRisk, toApiError, updateRisk } from "@/api/client";

type Props = {
  navigation: { navigate: (route: "Tabs") => void };
};

export default function RiskSettingsScreen({ navigation }: Props): React.JSX.Element {
  const [maxDailyLoss, setMaxDailyLoss] = useState<string>("150");
  const [riskPerTrade, setRiskPerTrade] = useState<string>("45");
  const [maxTrades, setMaxTrades] = useState<string>("1");
  const [maxNotionalPct, setMaxNotionalPct] = useState<string>("0.2");
  const [capitalLimitMode, setCapitalLimitMode] = useState<"pct" | "usd">("pct");
  const [capitalLimitValue, setCapitalLimitValue] = useState<string>("1");
  const [killSwitch, setKillSwitch] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [tips, setTips] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getRisk()
      .then((risk) => {
        setMaxDailyLoss(String(risk.max_daily_loss_usd));
        setRiskPerTrade(String(risk.risk_per_trade_usd));
        setMaxTrades(String(risk.max_trades_per_day));
        setMaxNotionalPct(String(risk.max_notional_pct));
        setCapitalLimitMode(risk.capital_limit_mode ?? "pct");
        setCapitalLimitValue(String(risk.capital_limit_value ?? 1));
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
        capital_limit_mode: capitalLimitMode,
        capital_limit_value: Number(capitalLimitValue),
        kill_switch_enabled: killSwitch,
      });
      Alert.alert("Saved", "Risk settings updated.");
      navigation.navigate("Tabs");
    } catch (error) {
      Alert.alert("Save failed", toApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const toggleTip = (key: string) => {
    setTips((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Max Daily Loss (USD)</Text>
        <Pressable onPress={() => toggleTip("maxDailyLoss")}><Text style={styles.tipIcon}>i</Text></Pressable>
      </View>
      {tips.maxDailyLoss ? <Text style={styles.tip}>Maximum loss you allow in one day before trading should stop.</Text> : null}
      <TextInput style={styles.input} keyboardType="numeric" value={maxDailyLoss} onChangeText={setMaxDailyLoss} />

      <View style={styles.labelRow}>
        <Text style={styles.label}>Risk Per Trade (USD)</Text>
        <Pressable onPress={() => toggleTip("riskPerTrade")}><Text style={styles.tipIcon}>i</Text></Pressable>
      </View>
      {tips.riskPerTrade ? <Text style={styles.tip}>Dollar amount you are willing to lose if a single trade hits stop loss.</Text> : null}
      <TextInput style={styles.input} keyboardType="numeric" value={riskPerTrade} onChangeText={setRiskPerTrade} />

      <View style={styles.labelRow}>
        <Text style={styles.label}>Max Trades Per Day</Text>
        <Pressable onPress={() => toggleTip("maxTrades")}><Text style={styles.tipIcon}>i</Text></Pressable>
      </View>
      {tips.maxTrades ? <Text style={styles.tip}>Hard limit on number of entries per day.</Text> : null}
      <TextInput style={styles.input} keyboardType="numeric" value={maxTrades} onChangeText={setMaxTrades} />

      <View style={styles.labelRow}>
        <Text style={styles.label}>Max Notional Pct</Text>
        <Pressable onPress={() => toggleTip("maxNotional")}><Text style={styles.tipIcon}>i</Text></Pressable>
      </View>
      {tips.maxNotional ? <Text style={styles.tip}>Maximum percentage of available capital allowed in one position.</Text> : null}
      <TextInput style={styles.input} keyboardType="numeric" value={maxNotionalPct} onChangeText={setMaxNotionalPct} />

      <View style={styles.labelRow}>
        <Text style={styles.label}>App Capital Limit Mode</Text>
        <Pressable onPress={() => toggleTip("capitalMode")}><Text style={styles.tipIcon}>i</Text></Pressable>
      </View>
      {tips.capitalMode ? <Text style={styles.tip}>Choose whether app capital is controlled by percent of equity or a fixed USD amount.</Text> : null}
      <View style={styles.row}>
        <Pressable style={[styles.pill, capitalLimitMode === "pct" && styles.activePill]} onPress={() => setCapitalLimitMode("pct")}>
          <Text style={[styles.pillText, capitalLimitMode === "pct" && styles.activePillText]}>Percent</Text>
        </Pressable>
        <Pressable style={[styles.pill, capitalLimitMode === "usd" && styles.activePill]} onPress={() => setCapitalLimitMode("usd")}>
          <Text style={[styles.pillText, capitalLimitMode === "usd" && styles.activePillText]}>Fixed USD</Text>
        </Pressable>
      </View>

      <View style={styles.labelRow}>
        <Text style={styles.label}>{capitalLimitMode === "pct" ? "Capital Limit Value (0-1)" : "Capital Limit Value (USD)"}</Text>
        <Pressable onPress={() => toggleTip("capitalValue")}><Text style={styles.tipIcon}>i</Text></Pressable>
      </View>
      {tips.capitalValue ? (
        <Text style={styles.tip}>
          {capitalLimitMode === "pct"
            ? "Example: 0.5 means app can use up to 50% of account equity."
            : "Example: 5000 means app can size positions only from first $5,000."}
        </Text>
      ) : null}
      <TextInput style={styles.input} keyboardType="numeric" value={capitalLimitValue} onChangeText={setCapitalLimitValue} />

      <View style={styles.switchRow}>
        <View>
          <Text style={styles.label}>Pause Trading</Text>
          <Text style={styles.tip}>Emergency switch to block new proposal execution.</Text>
        </View>
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
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tipIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    textAlign: "center",
    textAlignVertical: "center",
    backgroundColor: "#e2e8f0",
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden",
  },
  tip: { color: "#64748b", fontSize: 12, marginTop: -4 },
  row: { flexDirection: "row", gap: 8 },
  pill: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "white",
  },
  activePill: { backgroundColor: "#0f172a", borderColor: "#0f172a" },
  pillText: { color: "#334155", fontWeight: "600" },
  activePillText: { color: "white" },
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
