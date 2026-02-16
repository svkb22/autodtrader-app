import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { approveProposal, getCurrentProposal, rejectProposal, toApiError } from "@/api/client";
import { Proposal, ProposalDecisionResult } from "@/api/types";
import Countdown from "@/components/Countdown";
import ProposalCard from "@/components/ProposalCard";
import { isExpired } from "@/utils/time";

type Props = {
  route?: { params?: { proposalId?: string } };
};

export default function ProposalScreen({ route }: Props): JSX.Element {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [result, setResult] = useState<ProposalDecisionResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const load = useCallback(async () => {
    try {
      const current = await getCurrentProposal();
      setProposal(current);
    } catch (error) {
      Alert.alert("Load failed", toApiError(error));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, route?.params?.proposalId]);

  const canAct = useMemo(() => {
    if (!proposal) return false;
    if (proposal.status !== "pending") return false;
    return !isExpired(proposal.expires_at);
  }, [proposal]);

  const onApprove = async () => {
    if (!proposal) return;
    try {
      setLoading(true);
      const response = await approveProposal(proposal.id);
      setResult(response);
      await load();
    } catch (error) {
      Alert.alert("Approve failed", toApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const onReject = async () => {
    if (!proposal) return;
    try {
      setLoading(true);
      const response = await rejectProposal(proposal.id);
      setResult(response);
      await load();
    } catch (error) {
      Alert.alert("Reject failed", toApiError(error));
    } finally {
      setLoading(false);
    }
  };

  if (!proposal) {
    return (
      <View style={styles.center}>
        <Text>No active proposal</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ProposalCard proposal={proposal} />
      <Text style={styles.label}>Expires In</Text>
      <Countdown expiresAtISO={proposal.expires_at} onExpire={load} />
      {!canAct ? <Text style={styles.statusText}>Status: {proposal.status === "pending" ? "expired" : proposal.status}</Text> : null}

      <View style={styles.row}>
        <Pressable style={[styles.button, !canAct && styles.disabled]} disabled={!canAct || loading} onPress={onApprove}>
          <Text style={styles.buttonText}>Approve</Text>
        </Pressable>
        <Pressable style={[styles.rejectButton, !canAct && styles.disabled]} disabled={!canAct || loading} onPress={onReject}>
          <Text style={styles.buttonText}>Reject</Text>
        </Pressable>
      </View>

      {result ? (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>Result: {result.status}</Text>
          <Text>{result.message}</Text>
          {result.order ? (
            <Text>
              Order {result.order.symbol} • {result.order.status} • TP {result.order.take_profit_price} • SL {result.order.stop_loss_price}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12, backgroundColor: "#f8fafc" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  label: { color: "#334155", fontWeight: "600" },
  statusText: { color: "#b91c1c", fontWeight: "700" },
  row: { flexDirection: "row", gap: 10 },
  button: {
    flex: 1,
    backgroundColor: "#166534",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  rejectButton: {
    flex: 1,
    backgroundColor: "#b91c1c",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "700" },
  disabled: { opacity: 0.5 },
  result: { backgroundColor: "white", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 12, gap: 6 },
  resultTitle: { fontWeight: "700" },
});
