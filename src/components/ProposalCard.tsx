import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Proposal } from "@/api/types";
import { pct, usd } from "@/utils/format";

type Props = {
  proposal: Proposal;
};

export default function ProposalCard({ proposal }: Props): JSX.Element {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{proposal.side.toUpperCase()} {proposal.symbol}</Text>
      <Text style={styles.line}>Qty: {proposal.qty}</Text>
      <Text style={styles.line}>Score: {proposal.score.toFixed(2)}</Text>
      <Text style={styles.line}>Price: {usd(proposal.last_price_snapshot)}</Text>
      <Text style={styles.line}>Stop: {pct(proposal.stop_loss_pct)} | Target: {pct(proposal.take_profit_pct)}</Text>
    </View>
  );
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
