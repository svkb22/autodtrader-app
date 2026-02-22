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

  const content = (
    <View style={styles.card}>
      <Text style={styles.title}>{proposal.side.toUpperCase()} {proposal.symbol}</Text>
      <Text style={styles.line}>Qty: {proposal.qty}</Text>
      <Text style={styles.line}>Recommendation: {recommendationLabel(proposal.strength)}</Text>
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
  line: {
    color: "#374151",
  },
});
