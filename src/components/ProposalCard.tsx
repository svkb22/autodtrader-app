import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Proposal } from "@/api/types";
import { pct, usd } from "@/utils/format";

type Props = {
  proposal: Proposal;
  availableCapital?: number | null;
  onPress?: () => void;
};

function recommendationLabel(strength: Proposal["strength"]): string {
  if (strength === "strong") return "Strong";
  if (strength === "medium") return "Moderate";
  return "Watch";
}

export default function ProposalCard({ proposal, availableCapital = null, onPress }: Props): React.JSX.Element {
  const notional = proposal.qty * proposal.last_price_snapshot;
  const capitalPct = availableCapital && availableCapital > 0 ? (notional / availableCapital) * 100 : proposal.capital_used_pct * 100;
  const isShadow = proposal.status === "shadow" || proposal.is_shadow === true;

  const content = (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{proposal.side.toUpperCase()} {proposal.symbol}</Text>
        {isShadow ? (
          <View style={styles.shadowBadge}>
            <Text style={styles.shadowBadgeText}>Shadow (Debug)</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.line}>Qty: {proposal.qty}</Text>
      <Text style={styles.line}>Recommendation: {recommendationLabel(proposal.strength)}</Text>
      {isShadow && proposal.shadow_reason ? <Text style={styles.shadowReason}>{proposal.shadow_reason}</Text> : null}
      <Text style={styles.line}>Entry: {usd(proposal.entry.limit_price)} (limit)</Text>
      <Text style={styles.line}>Capital Used: {usd(notional)} ({capitalPct.toFixed(2)}%)</Text>
      <Text style={styles.line}>Stop: {pct(proposal.stop_loss_pct)} | Target: {pct(proposal.take_profit_pct)}</Text>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return <Pressable onPress={onPress}>{content}</Pressable>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    borderColor: "#e5e7eb",
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  line: {
    color: "#374151",
  },
  shadowBadge: {
    backgroundColor: "#e2e8f0",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  shadowBadgeText: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "700",
  },
  shadowReason: {
    color: "#475569",
    fontSize: 12,
  },
});
