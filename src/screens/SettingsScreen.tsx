import React, { useEffect, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { NavigationProp, ParamListBase, useNavigation } from "@react-navigation/native";

import { getRAnalyticsSummary } from "@/api/client";
import { RAnalyticsSummary } from "@/api/types";
import { useAuth } from "@/auth/AuthContext";

export default function SettingsScreen(): React.JSX.Element {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { signOut, userId } = useAuth();
  const [loggingOut, setLoggingOut] = useState<boolean>(false);
  const [rSummary, setRSummary] = useState<RAnalyticsSummary | null>(null);

  useEffect(() => {
    getRAnalyticsSummary(7)
      .then((summary) => setRSummary(summary))
      .catch(() => setRSummary(null));
  }, []);

  const performLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
    } finally {
      setLoggingOut(false);
    }
  };

  const onLogout = () => {
    if (Platform.OS === "web") {
      const accepted = typeof window !== "undefined" ? window.confirm("Are you sure you want to log out?") : true;
      if (accepted) {
        void performLogout();
      }
      return;
    }

    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => void performLogout(),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.sectionLabel}>Broker</Text>
      <Pressable style={styles.cardButton} onPress={() => navigation.navigate("Brokers")}>
        <View>
          <Text style={styles.cardTitle}>Brokers</Text>
          <Text style={styles.cardSubtitle}>Active connections, add new, and manage broker-level settings.</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Text style={styles.sectionLabel}>Account</Text>
      {userId ? (
        <View style={styles.debugCard}>
          <Text style={styles.debugLabel}>User ID</Text>
          <Text selectable style={styles.debugValue}>
            {userId}
          </Text>
        </View>
      ) : null}
      <Pressable style={[styles.logoutButton, loggingOut && styles.disabled]} onPress={onLogout} disabled={loggingOut}>
        <Text style={styles.logoutText}>{loggingOut ? "Logging out..." : "Log Out"}</Text>
      </Pressable>

      <Text style={styles.sectionLabel}>Performance (7D)</Text>
      <View style={styles.metricsCard}>
        <Text style={styles.metricLine}>Expectancy (Avg R): {rSummary?.expectancy_r != null ? rSummary.expectancy_r.toFixed(2) : "—"}</Text>
        <Text style={styles.metricLine}>Win Rate: {rSummary != null ? `${(rSummary.win_rate * 100).toFixed(1)}%` : "—"}</Text>
        <Text style={styles.metricLine}>
          Avg Win / Avg Loss: {rSummary?.avg_win_r != null ? rSummary.avg_win_r.toFixed(2) : "—"} / {rSummary?.avg_loss_r != null ? rSummary.avg_loss_r.toFixed(2) : "—"}
        </Text>
        <Text style={styles.metricLine}>Profit Factor: {rSummary?.profit_factor != null ? rSummary.profit_factor.toFixed(2) : "—"}</Text>
        <Text style={styles.metricLine}>
          Top Symbol Concentration: {rSummary != null ? `${(rSummary.concentration_top_symbol_pct * 100).toFixed(1)}%` : "—"}
        </Text>
        <View style={styles.tierRow}>
          <Text style={styles.tierTitle}>By Tier</Text>
          <Text style={styles.tierValue}>
            S {rSummary?.by_tier?.strong?.avg_r != null ? rSummary.by_tier.strong.avg_r.toFixed(2) : "—"} • M{" "}
            {rSummary?.by_tier?.medium?.avg_r != null ? rSummary.by_tier.medium.avg_r.toFixed(2) : "—"} • L{" "}
            {rSummary?.by_tier?.low?.avg_r != null ? rSummary.by_tier.low.avg_r.toFixed(2) : "—"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "800", color: "#0f172a", marginBottom: 4 },
  sectionLabel: { color: "#334155", fontWeight: "600" },
  cardButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "white",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitle: { color: "#0f172a", fontWeight: "700", fontSize: 16 },
  cardSubtitle: { color: "#64748b", marginTop: 3, fontSize: 13 },
  chevron: { color: "#94a3b8", fontSize: 22, lineHeight: 22 },
  debugCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "white",
    padding: 12,
    gap: 4,
  },
  debugLabel: { color: "#64748b", fontSize: 12, fontWeight: "600" },
  debugValue: { color: "#0f172a", fontSize: 12, fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }) },
  logoutButton: {
    marginTop: 2,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  logoutText: { color: "#b91c1c", fontWeight: "700" },
  disabled: { opacity: 0.6 },
  metricsCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "white",
    padding: 12,
    gap: 6,
  },
  metricLine: { color: "#0f172a", fontSize: 13, fontWeight: "600" },
  tierRow: { marginTop: 2, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#f1f5f9", gap: 2 },
  tierTitle: { color: "#64748b", fontSize: 12, fontWeight: "600" },
  tierValue: { color: "#0f172a", fontSize: 12, fontWeight: "700" },
});
