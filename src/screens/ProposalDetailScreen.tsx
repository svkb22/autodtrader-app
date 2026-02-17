import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { getProposalsHistory, toApiError } from "@/api/client";
import { ProposalHistoryItem } from "@/api/types";
import { dateTime, usd } from "@/utils/format";

type Props = {
  route?: { params?: { proposalId?: string } };
};

export default function ProposalDetailScreen({ route }: Props): React.JSX.Element {
  const proposalId = route?.params?.proposalId;
  const [item, setItem] = useState<ProposalHistoryItem | null>(null);

  useEffect(() => {
    if (!proposalId) return;
    getProposalsHistory(200)
      .then((res) => {
        const found = res.items.find((p) => p.id === proposalId) || null;
        setItem(found);
      })
      .catch((e) => Alert.alert("Load failed", toApiError(e)));
  }, [proposalId]);

  if (!item) {
    return (
      <View style={styles.center}>
        <Text>Proposal not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{item.side.toUpperCase()} {item.symbol}</Text>
      <Text style={styles.meta}>Status: {item.status}</Text>
      <Text style={styles.meta}>Strength: {item.strength}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Rationale</Text>
        {item.rationale.length === 0 ? <Text style={styles.subtle}>No rationale available.</Text> : item.rationale.slice(0, 3).map((r) => (
          <Text key={r} style={styles.row}>• {r}</Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Risk</Text>
        <Text style={styles.row}>Max Loss: {usd(item.risk.max_loss_usd)}</Text>
        <Text style={styles.row}>Target: {usd(item.risk.target_usd)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Prices</Text>
        <Text style={styles.row}>Entry: {item.prices.entry_limit_price == null ? "-" : usd(item.prices.entry_limit_price)}</Text>
        <Text style={styles.row}>Stop: {item.prices.stop_loss_price == null ? "-" : usd(item.prices.stop_loss_price)}</Text>
        <Text style={styles.row}>Target: {item.prices.take_profit_price == null ? "-" : usd(item.prices.take_profit_price)}</Text>
        <Text style={styles.row}>Filled Avg: {item.prices.filled_avg_price == null ? "-" : usd(item.prices.filled_avg_price)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Timestamps</Text>
        <Text style={styles.row}>Created: {dateTime(item.created_at)}</Text>
        <Text style={styles.row}>Decision: {item.decision_at ? dateTime(item.decision_at) : "-"}</Text>
        <Text style={styles.row}>Filled: {item.prices.filled_at ? dateTime(item.prices.filled_at) : "-"}</Text>
      </View>

      {item.order_summary ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order</Text>
          <Text style={styles.row}>Status: {item.order_summary.status}</Text>
          <Text style={styles.row}>Submitted: {dateTime(item.order_summary.submitted_at)}</Text>
          <Text style={styles.row}>Filled: {item.order_summary.filled_at ? dateTime(item.order_summary.filled_at) : "-"}</Text>
        </View>
      ) : null}

      {item.reason ? <Text style={styles.reason}>{item.reason}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16, gap: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "800", color: "#0f172a" },
  meta: { color: "#334155", fontWeight: "600" },
  card: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  cardTitle: { color: "#0f172a", fontWeight: "700" },
  row: { color: "#334155" },
  subtle: { color: "#64748b" },
  reason: { color: "#64748b", marginTop: 4 },
});
