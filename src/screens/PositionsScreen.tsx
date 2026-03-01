import React, { useCallback, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { getActivity } from "@/api/activity";
import { getRisk } from "@/api/client";
import { ActivityItem } from "@/api/types";
import ErrorState from "@/components/ErrorState";
import { getActiveBrokerMode } from "@/storage/brokerMode";
import { usd } from "@/utils/format";

function isOpenPosition(item: ActivityItem): boolean {
  return item.status === "open" || (item.status === "executed" && !item.exit_fill_price && item.realized_pnl == null);
}

export default function PositionsScreen(): React.JSX.Element {
  const [positions, setPositions] = useState<ActivityItem[]>([]);
  const [dailyCap, setDailyCap] = useState<number>(0);
  const [activeMode, setActiveMode] = useState<"paper" | "live">("paper");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [activity, risk, mode] = await Promise.all([getActivity({ status: "all", range: "all", limit: 200 }), getRisk(), getActiveBrokerMode()]);
      const openItems = activity.items.filter(isOpenPosition);
      openItems.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
      setPositions(openItems);
      setDailyCap(risk.max_daily_loss_usd);
      setActiveMode(mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load positions.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const riskUsed = useMemo(() => positions.reduce((sum, item) => sum + (item.risk_used_usd ?? 0), 0), [positions]);
  const riskRemaining = Math.max(0, dailyCap - riskUsed);
  const unrealizedTotal = useMemo(() => positions.reduce((sum, item) => sum + (item.unrealized_pnl ?? 0), 0), [positions]);

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={positions}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      ListHeaderComponent={
        <View style={styles.headerWrap}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Positions</Text>
            <Text style={styles.modeChip}>{`Alpaca • ${activeMode === "live" ? "Live" : "Paper"}`}</Text>
          </View>
          <Text style={styles.subtitle}>Open trades only. Calm tracking, no noise.</Text>
          <View style={styles.metricsCard}>
            <Text style={[styles.metricValue, { color: unrealizedTotal >= 0 ? "#166534" : "#b91c1c" }]}>Unrealized: {unrealizedTotal >= 0 ? "+" : ""}{usd(unrealizedTotal)}</Text>
            <Text style={styles.metricSub}>Risk remaining today: {usd(riskRemaining)} / {usd(dailyCap)}</Text>
          </View>
          {error ? <ErrorState message={error} onRetry={load} /> : null}
        </View>
      }
      ListEmptyComponent={<View style={styles.emptyCard}><Text style={styles.emptyText}>No open positions.</Text></View>}
      renderItem={({ item }) => {
        const unrealized = item.unrealized_pnl ?? 0;
        const pnlColor = unrealized >= 0 ? "#166534" : "#b91c1c";
        return (
          <View style={styles.card}>
            <View style={styles.row1}>
              <Text style={styles.symbol}>{item.symbol} • {item.side === "long" ? "Long" : "Short"}</Text>
              <Text style={styles.openChip}>Open Position</Text>
            </View>
            <Text style={[styles.pnl, { color: pnlColor }]}>Unrealized P/L {unrealized >= 0 ? "+" : ""}{usd(unrealized)}</Text>
            <Text style={styles.meta}>Entry {item.filled_avg_price != null ? usd(item.filled_avg_price) : item.entry_price != null ? usd(item.entry_price) : "-"}</Text>
            <Text style={styles.meta}>Risk {typeof item.risk_used_usd === "number" ? usd(item.risk_used_usd) : "-"}</Text>
            {item.order_status ? <Text style={styles.meta}>Exit Order: {item.order_status}</Text> : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  content: { padding: 16, gap: 10, paddingBottom: 24 },
  headerWrap: { gap: 10, marginBottom: 6 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  title: { fontSize: 24, fontWeight: "800", color: "#0f172a" },
  modeChip: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "700",
    backgroundColor: "#e2e8f0",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  subtitle: { color: "#64748b", fontSize: 13 },
  metricsCard: {
    backgroundColor: "white",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    gap: 4,
  },
  metricValue: { fontSize: 18, fontWeight: "800" },
  metricSub: { color: "#334155", fontSize: 13, fontWeight: "600" },
  emptyCard: {
    backgroundColor: "white",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
  },
  emptyText: { color: "#64748b" },
  card: {
    backgroundColor: "white",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#dbe3ef",
    padding: 14,
    gap: 6,
  },
  row1: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  symbol: { color: "#0f172a", fontWeight: "800", fontSize: 20 },
  openChip: {
    color: "#1d4ed8",
    backgroundColor: "#dbeafe",
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  pnl: { fontSize: 18, fontWeight: "800" },
  meta: { color: "#64748b", fontSize: 13, fontWeight: "600" },
});
