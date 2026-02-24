import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, LayoutAnimation, Linking, Platform, Pressable, StyleSheet, Text, UIManager, View } from "react-native";

import { approveProposal, getBrokerAccount, getCurrentProposal, getOrderOutcomes, getProposalById, rejectProposal, toApiError } from "@/api/client";
import { BrokerAccount, OrderOutcome, Proposal, ProposalDecisionResult } from "@/api/types";
import Countdown from "@/components/Countdown";
import MiniSparkline from "@/components/MiniSparkline";
import { signedPct, usd, usdCompact } from "@/utils/format";
import { isExpired } from "@/utils/time";

type Props = {
  route?: { params?: { proposalId?: string } };
};

function pnlColor(value: number): string {
  if (value > 0) return "#166534";
  if (value < 0) return "#b91c1c";
  return "#475569";
}

function recommendationText(strength: Proposal["strength"]): string {
  if (strength === "strong") return "Strong";
  if (strength === "medium") return "Moderate";
  return "Watch";
}

export default function ProposalScreen({ route }: Props): React.JSX.Element {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [result, setResult] = useState<ProposalDecisionResult | null>(null);
  const [outcome, setOutcome] = useState<OrderOutcome | null>(null);
  const [brokerAccount, setBrokerAccount] = useState<BrokerAccount | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [overviewOpen, setOverviewOpen] = useState<boolean>(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chevronAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const proposalId = route?.params?.proposalId;
      const current = proposalId ? await getProposalById(proposalId) : await getCurrentProposal();
      setProposal(current);
      const account = await getBrokerAccount();
      setBrokerAccount(account);
    } catch (error) {
      Alert.alert("Load failed", toApiError(error));
    }
  }, [route?.params?.proposalId]);

  useEffect(() => {
    load();
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [load]);

  const canAct = useMemo(() => {
    if (!proposal) return false;
    if (proposal.is_shadow || proposal.status === "shadow") return false;
    if (proposal.status !== "pending") return false;
    return !isExpired(proposal.expires_at);
  }, [proposal]);

  const isShadow = proposal?.is_shadow || proposal?.status === "shadow";

  const onApprove = useCallback(async () => {
    if (!proposal) return;
    try {
      setLoading(true);
      const response = await approveProposal(proposal.id);
      setResult(response);
      if (response.order) {
        const allOutcomes = await getOrderOutcomes();
        setOutcome(allOutcomes[response.order.id] ?? null);
      } else {
        setOutcome(null);
      }
      await load();
    } catch (error) {
      Alert.alert("Approve failed", toApiError(error));
    } finally {
      setLoading(false);
      setHoldProgress(0);
    }
  }, [load, proposal]);

  const onReject = async () => {
    if (!proposal) return;
    try {
      setLoading(true);
      const response = await rejectProposal(proposal.id);
      setResult(response);
      setOutcome(null);
      await load();
    } catch (error) {
      Alert.alert("Reject failed", toApiError(error));
    } finally {
      setLoading(false);
      setHoldProgress(0);
    }
  };

  const onApprovePressIn = () => {
    if (!canAct || loading) return;
    setHoldProgress(0);
    const start = Date.now();
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      setHoldProgress(Math.min(1, elapsed / 700));
    }, 16);
    holdTimerRef.current = setTimeout(() => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      onApprove();
    }, 700);
  };

  const onApprovePressOut = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (!loading) {
      setHoldProgress(0);
    }
  };

  const toggleOverview = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const to = overviewOpen ? 0 : 1;
    setOverviewOpen((v) => !v);
    Animated.timing(chevronAnim, {
      toValue: to,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  if (!proposal) {
    return (
      <View style={styles.center}>
        <Text>No active proposal</Text>
      </View>
    );
  }

  const notional = proposal.entry.limit_price * proposal.qty;
  const riskUsd = notional * proposal.stop_loss_pct;
  const targetUsd = notional * proposal.take_profit_pct;
  const debugPayload = (proposal.debug_payload ?? null) as Record<string, unknown> | null;
  const debugMetrics = (debugPayload?.metrics ?? null) as Record<string, unknown> | null;
  const debugBreakdown = (debugPayload?.score_breakdown ?? null) as Record<string, unknown> | null;
  const debugGates = (debugPayload?.gates ?? null) as Record<string, unknown> | null;
  const debugGateEntries = debugGates ? Object.entries(debugGates) : [];

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.headRow}>
          <Text style={styles.side}>BUY {proposal.symbol}</Text>
          {isShadow ? (
            <View style={styles.shadowBadge}>
              <Text style={styles.shadowBadgeText}>Shadow</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.reco}>Recommendation: {recommendationText(proposal.strength)}</Text>
        {isShadow ? <Text style={styles.shadowInfo}>{proposal.shadow_reason ?? "Shadow proposal (non-actionable)"}</Text> : null}

        <Text style={styles.bigText}>Risk {usd(riskUsd)} • Target {usd(targetUsd)}</Text>
        <Text style={styles.subtle}>Reward/Risk 2.0x</Text>

        <View style={styles.whyBox}>
          <Text style={styles.whyTitle}>Why</Text>
          {proposal.rationale.slice(0, 3).map((line) => (
            <Text key={line} style={styles.whyLine}>• {line}</Text>
          ))}
        </View>

        <Text style={styles.meta}>Entry: limit {usd(proposal.entry.limit_price)} • Qty {proposal.qty}</Text>
        <Text style={styles.meta}>Capital Used: {(proposal.capital_used_pct * 100).toFixed(2)}%</Text>
        <Text style={styles.meta}>Daily Risk Remaining: {usd(proposal.daily_risk_remaining_usd)}</Text>
        <Text style={styles.meta}>Buying Power: {brokerAccount ? usd(Number(brokerAccount.buying_power || 0)) : "N/A"}</Text>

        <Text style={styles.label}>Expires In</Text>
        <Countdown expiresAtISO={proposal.expires_at} onExpire={load} />
        {!canAct ? (
          <Text style={styles.statusText}>
            Status: {proposal.status === "pending" ? "expired" : proposal.status}
            {isShadow ? " (debug-only)" : ""}
          </Text>
        ) : null}

        {isShadow ? (
          <View style={styles.debugBanner}>
            <Text style={styles.debugBannerText}>Shadow mode: approvals and execution are disabled for shadow proposals.</Text>
          </View>
        ) : (
          <>
            <Pressable
              style={[styles.holdButton, (!canAct || loading) && styles.disabled]}
              disabled={!canAct || loading}
              onPressIn={onApprovePressIn}
              onPressOut={onApprovePressOut}
            >
              <View style={[styles.holdProgress, { width: `${holdProgress * 100}%` }]} />
              <Text style={styles.buttonText}>Press and hold to approve</Text>
            </Pressable>

            <Pressable style={[styles.rejectButton, (!canAct || loading) && styles.disabled]} disabled={!canAct || loading} onPress={onReject}>
              <Text style={styles.buttonText}>Reject</Text>
            </Pressable>
          </>
        )}

        {isShadow && debugPayload ? (
          <View style={styles.debugPanel}>
            <Text style={styles.debugPanelTitle}>Engine Debug</Text>
            {debugMetrics ? (
              <Text style={styles.debugLine}>
                Metrics: ret5 {String(debugMetrics.ret_5m ?? "-")} • ret15 {String(debugMetrics.ret_15m ?? "-")} • rel vol {String(debugMetrics.rel_vol ?? "-")} • spread {String(debugMetrics.spread_pct ?? "-")} • ATR {String(debugMetrics.atr_proxy ?? "-")} • bars {String(debugMetrics.bars_count ?? "-")}
              </Text>
            ) : null}
            {debugBreakdown ? (
              <Text style={styles.debugLine}>
                Score: {String(debugBreakdown.score_total ?? proposal.score)} (mom {String(debugBreakdown.s_mom ?? "-")}, relvol {String(debugBreakdown.s_relvol ?? "-")}, spread {String(debugBreakdown.s_spread ?? "-")}, vol {String(debugBreakdown.s_vol ?? "-")})
              </Text>
            ) : null}
            {debugGateEntries.length > 0 ? (
              <View style={styles.gatesList}>
                {debugGateEntries.slice(0, 12).map(([name, value]) => {
                  const gate = (value ?? {}) as Record<string, unknown>;
                  const passed = Boolean(gate.passed);
                  return (
                    <View key={name} style={styles.gateRow}>
                      <Text style={styles.gateName}>{name}</Text>
                      <Text style={[styles.gateValue, passed ? styles.gatePass : styles.gateFail]}>
                        {passed ? "pass" : "fail"} • {String(gate.value ?? "-")} / {String(gate.threshold ?? "-")}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.overviewWrap}>
          <Pressable style={styles.overviewHeader} onPress={toggleOverview}>
            <View>
              <Text style={styles.overviewTitle}>Stock Overview</Text>
              <Text style={styles.overviewSubtle}>
                {proposal.stock_overview?.last_price != null ? usd(proposal.stock_overview.last_price) : "Price unavailable"}
                {proposal.stock_overview?.market_cap_segment ? ` • ${proposal.stock_overview.market_cap_segment}` : ""}
              </Text>
            </View>
            <Animated.Text
              style={[
                styles.chevron,
                {
                  transform: [
                    {
                      rotate: chevronAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0deg", "90deg"],
                      }),
                    },
                  ],
                },
              ]}
            >
              ›
            </Animated.Text>
          </Pressable>

          {overviewOpen ? (
            <View style={styles.overviewBody}>
              <Text style={styles.overviewLine}>Company: {proposal.stock_overview?.company_name ?? proposal.symbol}</Text>
              <Text style={styles.overviewLine}>Current Price: {proposal.stock_overview?.last_price != null ? usd(proposal.stock_overview.last_price) : "-"}</Text>
              <Text style={styles.overviewLine}>
                Market Cap: {proposal.stock_overview?.market_cap != null ? usdCompact(proposal.stock_overview.market_cap) : "-"}
                {proposal.stock_overview?.market_cap_segment ? ` (${proposal.stock_overview.market_cap_segment})` : ""}
              </Text>
              <Text style={styles.overviewLine}>Sector: {proposal.stock_overview?.sector ?? "-"}</Text>
              <Text style={styles.overviewLine}>
                52W Range: {proposal.stock_overview?.week52_low != null ? usd(proposal.stock_overview.week52_low) : "-"} -{" "}
                {proposal.stock_overview?.week52_high != null ? usd(proposal.stock_overview.week52_high) : "-"}
              </Text>
              <Text style={styles.overviewMuted}>
                Intraday:{" "}
                {proposal.stock_overview?.intraday_change_pct != null ? signedPct(proposal.stock_overview.intraday_change_pct) : "-"}
              </Text>
              <MiniSparkline data={proposal.stock_overview?.sparkline ?? []} />
              {proposal.stock_overview?.read_more_url ? (
                <Pressable onPress={() => Linking.openURL(proposal.stock_overview!.read_more_url!)}>
                  <Text style={styles.readMore}>Read more</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
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

          {outcome ? (
            <View style={styles.outcomeBox}>
              <Text style={styles.resultTitle}>Outcome</Text>
              <Text>Entry Notional: {usd(outcome.entry_notional)}</Text>
              <Text style={{ color: pnlColor(outcome.unrealized_pnl) }}>Unrealized P/L: {usd(outcome.unrealized_pnl)}</Text>
              <Text style={{ color: pnlColor(outcome.realized_pnl) }}>Realized P/L: {usd(outcome.realized_pnl)}</Text>
              <Text>State: {outcome.state}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12, backgroundColor: "#f8fafc" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: "white",
    borderRadius: 14,
    borderColor: "#e2e8f0",
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  side: { color: "#0f172a", fontSize: 28, fontWeight: "800" },
  shadowBadge: {
    backgroundColor: "#e2e8f0",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  shadowBadgeText: { color: "#334155", fontSize: 11, fontWeight: "700" },
  reco: { color: "#334155", fontWeight: "700" },
  shadowInfo: { color: "#475569", fontSize: 12 },
  bigText: { color: "#111827", fontSize: 20, fontWeight: "800" },
  subtle: { color: "#64748b" },
  whyBox: { backgroundColor: "#f8fafc", borderRadius: 10, padding: 10, gap: 4 },
  whyTitle: { color: "#0f172a", fontWeight: "700" },
  whyLine: { color: "#334155" },
  meta: { color: "#1f2937", fontWeight: "600" },
  label: { color: "#334155", fontWeight: "600", marginTop: 2 },
  statusText: { color: "#b91c1c", fontWeight: "700" },
  debugBanner: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: "#eef2ff",
    borderWidth: 1,
    borderColor: "#c7d2fe",
    padding: 10,
  },
  debugBannerText: { color: "#3730a3", fontSize: 12, fontWeight: "600" },
  holdButton: {
    marginTop: 8,
    height: 52,
    borderRadius: 10,
    backgroundColor: "#166534",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  holdProgress: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#22c55e",
  },
  rejectButton: {
    height: 48,
    borderRadius: 10,
    backgroundColor: "#b91c1c",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "white", fontWeight: "700", zIndex: 1 },
  disabled: { opacity: 0.5 },
  result: { backgroundColor: "white", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 12, gap: 6 },
  resultTitle: { fontWeight: "700" },
  outcomeBox: { marginTop: 8, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 8, gap: 4 },
  overviewWrap: { marginTop: 10, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 10, gap: 8 },
  overviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  overviewTitle: { color: "#0f172a", fontWeight: "700" },
  overviewSubtle: { color: "#64748b", fontSize: 12, marginTop: 2 },
  chevron: { color: "#64748b", fontSize: 20, fontWeight: "700" },
  overviewBody: { gap: 6, backgroundColor: "#f8fafc", borderRadius: 10, padding: 10 },
  overviewLine: { color: "#334155", fontSize: 13 },
  overviewMuted: { color: "#64748b", fontSize: 12 },
  readMore: { color: "#2563eb", fontWeight: "600", marginTop: 2 },
  debugPanel: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
    gap: 6,
  },
  debugPanelTitle: { color: "#0f172a", fontWeight: "700" },
  debugLine: { color: "#334155", fontSize: 12 },
  gatesList: { gap: 4, marginTop: 2 },
  gateRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  gateName: { color: "#334155", fontSize: 12, flexShrink: 1 },
  gateValue: { fontSize: 12, flexShrink: 1, textAlign: "right" },
  gatePass: { color: "#166534" },
  gateFail: { color: "#b91c1c" },
});
