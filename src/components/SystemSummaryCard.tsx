import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { getActivity } from "@/api/activity";
import { getBrokerStatus, getRecentOrders, getRisk } from "@/api/client";
import { ActivityItem } from "@/api/types";
import { usd } from "@/utils/format";

type Snapshot = {
  systemStatus: "Active" | "Paused";
  mode: "Paper" | "Live" | "Disconnected";
  riskUsedTodayUsd: number;
  dailyCapUsd: number;
  openPositions: number;
  lastSyncLabel: string;
};

function isTodayLocal(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function isOpenPosition(item: ActivityItem): boolean {
  return item.status === "open" || (item.status === "executed" && !item.exit_fill_price && item.realized_pnl == null);
}

export default function SystemSummaryCard(): React.JSX.Element {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  const load = useCallback(async () => {
    try {
      const [risk, brokerStatus, orders, activity] = await Promise.all([
        getRisk(),
        getBrokerStatus(),
        getRecentOrders(),
        getActivity({ status: "all", range: "all", limit: 200 }),
      ]);

      const riskUsedTodayUsd = orders
        .filter((order) => isTodayLocal(order.submitted_at))
        .reduce((sum, order) => {
          const entry = order.avg_fill_price ?? order.take_profit_price ?? order.stop_loss_price ?? 0;
          const stop = order.stop_loss_price ?? entry;
          return sum + Math.max(0, Math.abs(entry - stop) * order.qty);
        }, 0);

      const openPositions = activity.items.filter(isOpenPosition).length;
      const mode = brokerStatus.connected
        ? brokerStatus.mode === "live"
          ? "Live"
          : "Paper"
        : "Disconnected";

      setSnapshot({
        systemStatus: risk.kill_switch_enabled ? "Paused" : "Active",
        mode,
        riskUsedTodayUsd,
        dailyCapUsd: risk.max_daily_loss_usd,
        openPositions,
        lastSyncLabel: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      });
    } catch {
      setSnapshot((prev) =>
        prev ?? {
          systemStatus: "Active",
          mode: "Disconnected",
          riskUsedTodayUsd: 0,
          dailyCapUsd: 0,
          openPositions: 0,
          lastSyncLabel: "--",
        }
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!snapshot) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <Text style={styles.loadingText}>Loading system summary...</Text>
      </View>
    );
  }

  const statusColor = snapshot.systemStatus === "Active" ? "#166534" : "#64748b";

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.title}>System Overview</Text>
        <Text style={[styles.statusChip, { color: statusColor }]}>{snapshot.systemStatus}</Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.metric}>
          <Text style={styles.label}>Mode</Text>
          <Text style={styles.value}>{snapshot.mode}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.label}>Open Positions</Text>
          <Text style={styles.value}>{snapshot.openPositions}</Text>
        </View>
        <View style={styles.metricWide}>
          <Text style={styles.label}>Risk Used Today</Text>
          <Text style={styles.value}>
            {usd(snapshot.riskUsedTodayUsd)} / {usd(snapshot.dailyCapUsd)}
          </Text>
        </View>
        <View style={styles.metricWide}>
          <Text style={styles.label}>Last Sync</Text>
          <Text style={styles.value}>{snapshot.lastSyncLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    gap: 12,
  },
  loadingCard: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 90,
  },
  loadingText: {
    color: "#64748b",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  statusChip: {
    fontSize: 12,
    fontWeight: "700",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metric: {
    width: "48%",
    gap: 3,
  },
  metricWide: {
    width: "100%",
    gap: 3,
  },
  label: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },
  value: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
});
