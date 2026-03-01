import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { approveProposal, getCurrentProposal, getExecutionRecent, getOrderOutcomes, getProposalsHistory, rejectProposal, toApiError } from "@/api/client";
import { ExecutionRecentItem, Proposal, ProposalDecisionResult, ProposalHistoryItem } from "@/api/types";
import Countdown from "@/components/Countdown";
import { getActiveBrokerMode } from "@/storage/brokerMode";
import { usd } from "@/utils/format";
import { isExpired } from "@/utils/time";

type Props = {
  route?: { params?: { proposalId?: string } };
};

type ExecutedTodayItem = {
  id: string;
  symbol: string;
  side: string;
  statusLine: string;
  pnlLine: string | null;
  filledAt: string | null;
};

function recommendationText(strength: Proposal["strength"]): string {
  if (strength === "strong") return "Strong";
  if (strength === "medium") return "Moderate";
  return "Watch";
}

function isTodayLocal(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function isLikelyAutoExecuted(item: ProposalHistoryItem): boolean {
  const blob = `${item.reason ?? ""} ${item.order_summary?.status ?? ""}`.toLowerCase();
  if (blob.includes("auto")) return true;
  // fallback: executed/approved with filled order but no manual reason text
  return (item.status === "executed" || item.status === "approved") && !!item.order_summary?.filled_at;
}

function mapExecutedToday(historyItems: ProposalHistoryItem[], execRecent: ExecutionRecentItem[]): ExecutedTodayItem[] {
  const execByProposal = new Map<string, ExecutionRecentItem>();
  for (const item of execRecent) {
    if (item.proposal_id) execByProposal.set(item.proposal_id, item);
  }

  return historyItems
    .filter((item) => (item.status === "executed" || item.status === "approved"))
    .filter(isLikelyAutoExecuted)
    .filter((item) => isTodayLocal(item.prices.filled_at ?? item.order_summary?.filled_at ?? item.created_at))
    .map((item) => {
      const exec = execByProposal.get(item.id);
      const isOpen = !exec?.actual_exit_fill && !exec?.realized_pnl;
      const closeHint = (item.reason ?? "").toLowerCase();
      const closeType = closeHint.includes("stop") ? "Stop Loss" : closeHint.includes("profit") ? "Take Profit" : "Closed";
      const statusLine = isOpen ? "Entry Filled • Position Open" : `Closed • ${closeType}`;
      const pnl = exec?.realized_pnl ?? null;
      return {
        id: item.id,
        symbol: item.symbol,
        side: item.side,
        statusLine,
        pnlLine: pnl == null ? null : `Realized ${pnl >= 0 ? "+" : ""}${usd(pnl)}`,
        filledAt: item.prices.filled_at ?? item.order_summary?.filled_at ?? null,
      };
    })
    .sort((a, b) => Date.parse(b.filledAt ?? "") - Date.parse(a.filledAt ?? ""));
}

export default function ProposalScreen(_props: Props): React.JSX.Element {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [executedToday, setExecutedToday] = useState<ExecutedTodayItem[]>([]);
  const [mode, setMode] = useState<"paper" | "live">("paper");
  const [result, setResult] = useState<ProposalDecisionResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [expandedExecuted, setExpandedExecuted] = useState<boolean>(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const [current, history, execRecent, activeMode] = await Promise.all([
        getCurrentProposal(),
        getProposalsHistory(200),
        getExecutionRecent(100).catch(() => ({ items: [] })),
        getActiveBrokerMode(),
      ]);
      setProposal(current);
      setMode(activeMode);
      const todayItems = mapExecutedToday(history.items, execRecent.items ?? []);
      setExecutedToday(todayItems);
      setExpandedExecuted(current == null);
    } catch (error) {
      Alert.alert("Load failed", toApiError(error));
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, [load]);

  const canAct = useMemo(() => {
    if (!proposal) return false;
    if (proposal.is_shadow || proposal.status === "shadow") return false;
    if (proposal.status !== "pending") return false;
    return !isExpired(proposal.expires_at);
  }, [proposal]);

  const onApprove = useCallback(async () => {
    if (!proposal) return;
    try {
      setLoading(true);
      const response = await approveProposal(proposal.id);
      setResult(response);
      await getOrderOutcomes();
      await load();
    } catch (error) {
      Alert.alert("Approve failed", toApiError(error));
    } finally {
      setLoading(false);
    }
  }, [load, proposal]);

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

  const notional = proposal ? proposal.entry.limit_price * proposal.qty : 0;
  const riskUsd = proposal ? notional * proposal.stop_loss_pct : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.statusStrip}>
        <Text style={styles.statusStripText}>{`Mode: Alpaca • ${mode === "live" ? "Live" : "Paper"}`}</Text>
      </View>

      <View style={styles.sectionWrap}>
        <Text style={styles.sectionTitle}>Action Required</Text>
        {!proposal ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No proposals awaiting approval.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>BUY {proposal.symbol}</Text>
            <Text style={styles.row}>Recommendation: {recommendationText(proposal.strength)}</Text>
            <Text style={styles.row}>Entry: {usd(proposal.entry.limit_price)} • Qty {proposal.qty}</Text>
            <Text style={styles.row}>Risk {usd(riskUsd)} • Capital {(proposal.capital_used_pct * 100).toFixed(2)}%</Text>

            <Text style={styles.label}>Expires In</Text>
            <Countdown expiresAtISO={proposal.expires_at} onExpire={load} />

            {!canAct ? <Text style={styles.statusText}>Status: {proposal.status === "pending" ? "expired" : proposal.status}</Text> : null}

            <Pressable style={[styles.actionButton, (!canAct || loading) && styles.disabled]} disabled={!canAct || loading} onPress={() => void onApprove()}>
              <Text style={styles.actionButtonText}>{loading ? "Approving..." : "Approve"}</Text>
            </Pressable>
            <Pressable style={[styles.rejectButton, (!canAct || loading) && styles.disabled]} disabled={!canAct || loading} onPress={onReject}>
              <Text style={styles.actionButtonText}>Reject</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.sectionWrap}>
        <Pressable style={styles.execHeader} onPress={() => setExpandedExecuted((v) => !v)}>
          <Text style={styles.sectionTitle}>Executed Today</Text>
          <Text style={styles.execCount}>{`${executedToday.length} ${expandedExecuted ? "▾" : "▸"}`}</Text>
        </Pressable>

        {expandedExecuted ? (
          executedToday.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No auto-executed trades today.</Text>
            </View>
          ) : (
            executedToday.map((item) => (
              <View key={item.id} style={styles.execCard}>
                <View style={styles.execTopRow}>
                  <Text style={styles.execTitle}>{item.symbol} • {item.side.toUpperCase()}</Text>
                  <Text style={styles.autoBadge}>Auto-executed</Text>
                </View>
                <Text style={styles.execStatus}>{item.statusLine}</Text>
                {item.pnlLine ? <Text style={styles.execPnl}>{item.pnlLine}</Text> : null}
                <Text style={styles.execTime}>{item.filledAt ? new Date(item.filledAt).toLocaleString() : "-"}</Text>
              </View>
            ))
          )
        ) : null}
      </View>

      {result ? (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>Result: {result.status}</Text>
          <Text>{result.message}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16, gap: 14, paddingBottom: 24 },
  statusStrip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusStripText: { color: "#334155", fontSize: 12, fontWeight: "700" },
  sectionWrap: { gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "white",
    padding: 12,
  },
  emptyText: { color: "#64748b" },
  card: {
    backgroundColor: "white",
    borderRadius: 14,
    borderColor: "#e2e8f0",
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  cardTitle: { color: "#0f172a", fontSize: 28, fontWeight: "800" },
  row: { color: "#1f2937", fontWeight: "600" },
  label: { color: "#334155", fontWeight: "600", marginTop: 2 },
  statusText: { color: "#b91c1c", fontWeight: "700" },
  actionButton: {
    height: 48,
    borderRadius: 10,
    backgroundColor: "#166534",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  rejectButton: {
    height: 46,
    borderRadius: 10,
    backgroundColor: "#b91c1c",
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: { color: "white", fontWeight: "700" },
  disabled: { opacity: 0.5 },
  execHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  execCount: { color: "#64748b", fontWeight: "700" },
  execCard: {
    backgroundColor: "white",
    borderRadius: 12,
    borderColor: "#e2e8f0",
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  execTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  execTitle: { color: "#0f172a", fontWeight: "700", fontSize: 16 },
  autoBadge: {
    color: "#1d4ed8",
    fontSize: 11,
    fontWeight: "800",
    backgroundColor: "#dbeafe",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: "hidden",
  },
  execStatus: { color: "#334155", fontWeight: "600" },
  execPnl: { color: "#166534", fontWeight: "700" },
  execTime: { color: "#64748b", fontSize: 12 },
  result: { backgroundColor: "white", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 12, gap: 6 },
  resultTitle: { fontWeight: "700" },
});
