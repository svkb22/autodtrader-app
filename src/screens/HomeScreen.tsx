import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, LayoutChangeEvent, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { getActivity } from "@/api/activity";
import {
  approveProposal,
  getBrokerAccount,
  getCurrentProposal,
  getExecutionRecent,
  getOrderOutcomes,
  getProposalsHistory,
  getRisk,
  getTradingWindowStatus,
  rejectProposal,
  toApiError,
} from "@/api/client";
import { ActivityItem, ExecutionRecentItem, Proposal, ProposalDecisionResult, ProposalHistoryItem, RiskProfile, TradingWindowStatus } from "@/api/types";
import Countdown from "@/components/Countdown";
import { getActiveBrokerMode } from "@/storage/brokerMode";
import { usd } from "@/utils/format";
import { isExpired } from "@/utils/time";

type Props = {
  route?: { params?: { proposalId?: string } };
};

type SparkRange = "1d" | "1w" | "1m";
type PositionStateFilter = "all" | "open" | "closed";
type SparkPoint = { x: number; y: number };

type TodaySummary = {
  executed: number;
  closed: number;
  expired: number;
};

type TodayTooltipKey = "executed" | "closed" | "expired" | null;

function recommendationText(strength: Proposal["strength"]): string {
  if (strength === "strong") return "Strong";
  if (strength === "medium") return "Moderate";
  return "Watch";
}

function isTodayLocal(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function historyFilledToday(item: ProposalHistoryItem): boolean {
  return isTodayLocal(item.prices.filled_at ?? item.order_summary?.filled_at ?? item.decision_at ?? item.created_at);
}

function computeAllocatedCapital(equity: number, risk: RiskProfile): number {
  const validEquity = Number.isFinite(equity) ? equity : 0;
  if (!Number.isFinite(risk.capital_limit_value)) return validEquity;
  if (risk.capital_limit_mode === "usd") return Math.max(0, risk.capital_limit_value);
  return Math.max(0, validEquity * risk.capital_limit_value);
}

function rangeCutoff(range: SparkRange): number {
  const now = Date.now();
  if (range === "1d") return now - 24 * 60 * 60 * 1000;
  if (range === "1w") return now - 7 * 24 * 60 * 60 * 1000;
  return now - 30 * 24 * 60 * 60 * 1000;
}

function buildSparkSeries(allocatedCapital: number, executions: ExecutionRecentItem[], range: SparkRange): number[] {
  const baseline = Number.isFinite(allocatedCapital) ? allocatedCapital : 0;
  const cutoff = rangeCutoff(range);

  const realizedEvents = executions
    .filter((item) => typeof item.realized_pnl === "number")
    .filter((item) => {
      const ts = Date.parse(item.exit_filled_at ?? item.filled_at ?? item.submitted_at);
      return !Number.isNaN(ts) && ts >= cutoff;
    })
    .sort((a, b) => {
      const aTs = Date.parse(a.exit_filled_at ?? a.filled_at ?? a.submitted_at);
      const bTs = Date.parse(b.exit_filled_at ?? b.filled_at ?? b.submitted_at);
      return aTs - bTs;
    })
    .slice(-80);

  if (realizedEvents.length === 0) {
    return [baseline, baseline];
  }

  const values: number[] = [baseline];
  let running = baseline;
  for (const event of realizedEvents) {
    running += Number(event.realized_pnl ?? 0);
    values.push(running);
  }
  return values;
}

function projectSpark(values: number[], width: number, height: number): SparkPoint[] {
  if (values.length === 0 || width <= 0 || height <= 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const span = Math.max(values.length - 1, 1);

  return values.map((value, index) => ({
    x: (index / span) * Math.max(width - 1, 1),
    y: ((max - value) / range) * Math.max(height - 1, 1),
  }));
}

function isOpenPosition(item: ActivityItem): boolean {
  if (item.position_state) return item.position_state === "open";
  return item.status === "open" || (item.status === "executed" && !item.exit_fill_price && item.realized_pnl == null);
}

function positionPnl(item: ActivityItem): number {
  if (isOpenPosition(item)) return item.unrealized_pnl ?? 0;
  return item.realized_pnl ?? item.pnl_total ?? 0;
}

function deviceTimezoneLabel(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";
  } catch {
    return "Local";
  }
}

export default function HomeScreen(_props: Props): React.JSX.Element {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [mode, setMode] = useState<"paper" | "live">("paper");
  const [summary, setSummary] = useState<TodaySummary>({ executed: 0, closed: 0, expired: 0 });
  const [todayPositions, setTodayPositions] = useState<ActivityItem[]>([]);
  const [positionFilter, setPositionFilter] = useState<PositionStateFilter>("all");
  const [executionRecent, setExecutionRecent] = useState<ExecutionRecentItem[]>([]);
  const [sparkRange, setSparkRange] = useState<SparkRange>("1d");
  const [equity, setEquity] = useState<number>(0);
  const [buyingPower, setBuyingPower] = useState<number>(0);
  const [allocatedCapital, setAllocatedCapital] = useState<number>(0);
  const [systemPaused, setSystemPaused] = useState<boolean>(false);
  const [tradingWindow, setTradingWindow] = useState<TradingWindowStatus | null>(null);
  const [sparkWidth, setSparkWidth] = useState<number>(0);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadedOnce, setLoadedOnce] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>("");
  const [hoveredTooltip, setHoveredTooltip] = useState<TodayTooltipKey>(null);
  const [result, setResult] = useState<ProposalDecisionResult | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    setErrorText("");
    try {
      const [current, history, execRecent, risk, activeMode, account, windowStatus, activity] = await Promise.all([
        getCurrentProposal(),
        getProposalsHistory(200),
        getExecutionRecent(400).catch(() => ({ items: [] })),
        getRisk(),
        getActiveBrokerMode(),
        getBrokerAccount(),
        getTradingWindowStatus().catch(() => null),
        getActivity({ status: "all", range: "1w", limit: 200, includeOverview: false }).catch(() => ({ items: [] })),
      ]);

      const executedToday = history.items.filter((item) => (item.status === "executed" || item.status === "approved") && historyFilledToday(item)).length;
      const expiredToday = history.items.filter((item) => item.status === "expired" && isTodayLocal(item.decision_at ?? item.created_at)).length;
      const closedToday = (execRecent.items ?? []).filter((item) => isTodayLocal(item.exit_filled_at)).length;

      const todayTradeRows = (activity.items ?? [])
        .filter((item) => item.status === "open" || item.status === "executed")
        .filter((item) => isTodayLocal(item.created_at))
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

      const currentEquity = Number(account?.equity ?? 0);
      const currentBuyingPower = Number(account?.buying_power ?? 0);
      const capital = computeAllocatedCapital(Number.isFinite(currentEquity) ? currentEquity : 0, risk);

      setProposal(current);
      setMode(activeMode);
      setSummary({ executed: executedToday, closed: closedToday, expired: expiredToday });
      setTodayPositions(todayTradeRows);
      setExecutionRecent(execRecent.items ?? []);
      setSystemPaused(Boolean(risk.kill_switch_enabled));
      setTradingWindow(windowStatus);
      setEquity(Number.isFinite(currentEquity) ? currentEquity : 0);
      setBuyingPower(Number.isFinite(currentBuyingPower) ? currentBuyingPower : 0);
      setAllocatedCapital(capital);
    } catch (error) {
      setErrorText(toApiError(error));
    } finally {
      setRefreshing(false);
      setLoadedOnce(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      };
    }, [load])
  );

  const canAct = useMemo(() => {
    if (!proposal) return false;
    if (proposal.is_shadow || proposal.status === "shadow") return false;
    if (proposal.status !== "pending") return false;
    return !isExpired(proposal.expires_at);
  }, [proposal]);

  const sparkValues = useMemo(() => buildSparkSeries(allocatedCapital, executionRecent, sparkRange), [allocatedCapital, executionRecent, sparkRange]);
  const sparkPoints = useMemo(() => projectSpark(sparkValues, sparkWidth, 58), [sparkValues, sparkWidth]);

  const trackedCapital = useMemo(() => {
    const last = sparkValues[sparkValues.length - 1];
    return Number.isFinite(last) ? Number(last) : allocatedCapital;
  }, [allocatedCapital, sparkValues]);

  const filteredPositions = useMemo(() => {
    if (positionFilter === "all") return todayPositions;
    return todayPositions.filter((item) => (positionFilter === "open" ? isOpenPosition(item) : !isOpenPosition(item)));
  }, [positionFilter, todayPositions]);

  const tradingWindowText = useMemo(() => {
    if (!tradingWindow) return "Trading Window: --";
    const base = `Trading Window: ${tradingWindow.start_et}-${tradingWindow.end_et} ET`;
    if (tradingWindow.is_open) return `${base} (Open)`;
    if (tradingWindow.next_open_et) {
      const next = new Date(tradingWindow.next_open_et);
      if (!Number.isNaN(next.getTime())) {
        const hh = String(next.getHours()).padStart(2, "0");
        const mm = String(next.getMinutes()).padStart(2, "0");
        return `${base} (Closed, next ${hh}:${mm} ET)`;
      }
    }
    return `${base} (Closed)`;
  }, [tradingWindow]);

  const onSparkLayout = (event: LayoutChangeEvent) => {
    const next = Math.max(1, Math.floor(event.nativeEvent.layout.width));
    if (next !== sparkWidth) setSparkWidth(next);
  };

  const onApprove = useCallback(async () => {
    if (!proposal) return;
    try {
      setLoadingAction(true);
      const response = await approveProposal(proposal.id);
      setResult(response);
      await getOrderOutcomes();
      await load();
    } catch (error) {
      Alert.alert("Approve failed", toApiError(error));
    } finally {
      setLoadingAction(false);
    }
  }, [load, proposal]);

  const onReject = useCallback(async () => {
    if (!proposal) return;
    try {
      setLoadingAction(true);
      const response = await rejectProposal(proposal.id);
      setResult(response);
      await load();
    } catch (error) {
      Alert.alert("Reject failed", toApiError(error));
    } finally {
      setLoadingAction(false);
    }
  }, [load, proposal]);

  const notional = proposal ? proposal.entry.limit_price * proposal.qty : 0;
  const riskUsd = proposal ? notional * proposal.stop_loss_pct : 0;
  const actionWidgetLoading = refreshing && !loadedOnce;
  const snapshotWidgetLoading = refreshing && !loadedOnce;
  const todayWidgetLoading = refreshing && !loadedOnce;

  const tooltipText = useCallback((key: Exclude<TodayTooltipKey, null>): string => {
    if (key === "executed") {
      return "Number of proposal signals that resulted in execution today. This is proposal-to-trade conversion, not just proposal creation.";
    }
    if (key === "closed") {
      return "Number of trades that completed today (exit was filled). These are trade lifecycle closes, regardless of win/loss.";
    }
    return "Number of proposals that timed out today without becoming a trade execution.";
  }, []);

  const onInfoPress = useCallback(
    (key: Exclude<TodayTooltipKey, null>, title: string) => {
      if (Platform.OS === "web") {
        setHoveredTooltip((prev) => (prev === key ? null : key));
        return;
      }
      Alert.alert(title, tooltipText(key));
    },
    [tooltipText]
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
    >
      <View style={styles.statusStrip}>
        <View style={styles.statusStripLeft}>
          <Text style={styles.statusStripText}>{`Mode: Alpaca • ${mode === "live" ? "Live" : "Paper"}`}</Text>
          <Text style={styles.statusStripSubtext}>{`Device Timezone: ${deviceTimezoneLabel()}`}</Text>
          <Text style={styles.statusStripSubtext}>{tradingWindowText}</Text>
        </View>
        <View style={styles.statusStripBadges}>
          <Text style={[styles.statusStripBadge, systemPaused ? styles.pausedBadge : styles.activeBadge]}>
            {systemPaused ? "Paused" : "Active"}
          </Text>
          <Text style={[styles.statusStripBadge, tradingWindow?.is_open ? styles.windowOpenBadge : styles.windowClosedBadge]}>
            {tradingWindow?.is_open ? "Window Open" : "Window Closed"}
          </Text>
        </View>
      </View>

      <View style={styles.sectionWrap}>
        <Text style={styles.sectionTitle}>Action Required</Text>
        {actionWidgetLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color="#64748b" />
            <Text style={styles.loadingText}>Loading proposal state...</Text>
          </View>
        ) : !proposal ? (
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

            <Pressable style={[styles.actionButton, (!canAct || loadingAction) && styles.disabled]} disabled={!canAct || loadingAction} onPress={() => void onApprove()}>
              <Text style={styles.actionButtonText}>{loadingAction ? "Approving..." : "Approve"}</Text>
            </Pressable>
            <Pressable style={[styles.rejectButton, (!canAct || loadingAction) && styles.disabled]} disabled={!canAct || loadingAction} onPress={() => void onReject()}>
              <Text style={styles.actionButtonText}>Reject</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.sectionWrap}>
        <Text style={styles.sectionTitle}>Live Snapshot</Text>
        <View style={styles.snapshotCard}>
          {snapshotWidgetLoading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color="#64748b" />
              <Text style={styles.loadingText}>Loading snapshot...</Text>
            </View>
          ) : (
            <>
              <View style={styles.snapshotHead}>
                <Text style={styles.snapshotValue}>{usd(trackedCapital)}</Text>
                <Text style={styles.snapshotMeta}>{`Allocated ${usd(allocatedCapital)} • Account Equity ${usd(equity)} • Buying Power ${usd(buyingPower)}`}</Text>
              </View>

              <View style={styles.pillRow}>
                {(["1d", "1w", "1m"] as SparkRange[]).map((item) => (
                  <Pressable key={item} style={[styles.pill, sparkRange === item && styles.pillActive]} onPress={() => setSparkRange(item)}>
                    <Text style={[styles.pillText, sparkRange === item && styles.pillTextActive]}>{item.toUpperCase()}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.sparkWrap} onLayout={onSparkLayout}>
                {sparkPoints.map((point, index) => {
                  if (index === 0) return null;
                  const prev = sparkPoints[index - 1];
                  const dx = point.x - prev.x;
                  const dy = point.y - prev.y;
                  const length = Math.sqrt(dx * dx + dy * dy);
                  const angle = Math.atan2(dy, dx);
                  return (
                    <View
                      key={`seg-${index}`}
                      style={[
                        styles.sparkSegment,
                        {
                          width: length,
                          left: prev.x + dx / 2 - length / 2,
                          top: prev.y + dy / 2,
                          transform: [{ rotateZ: `${angle}rad` }],
                        },
                      ]}
                    />
                  );
                })}
              </View>
            </>
          )}
        </View>
      </View>

      <View style={styles.sectionWrap}>
        <Text style={styles.sectionTitle}>Today</Text>
        {todayWidgetLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color="#64748b" />
            <Text style={styles.loadingText}>Loading today's widgets...</Text>
          </View>
        ) : (
          <>
            <View style={styles.todayGrid}>
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricLabel}>Executed Today</Text>
                  <Pressable
                    onPress={() => onInfoPress("executed", "Executed Today")}
                    onHoverIn={() => setHoveredTooltip("executed")}
                    onHoverOut={() => setHoveredTooltip((prev) => (prev === "executed" ? null : prev))}
                  >
                    <Text style={styles.infoIcon}>i</Text>
                  </Pressable>
                </View>
                <Text style={styles.metricValue}>{summary.executed}</Text>
                {hoveredTooltip === "executed" ? <Text style={styles.tooltipText}>{tooltipText("executed")}</Text> : null}
              </View>
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricLabel}>Closed</Text>
                  <Pressable
                    onPress={() => onInfoPress("closed", "Closed")}
                    onHoverIn={() => setHoveredTooltip("closed")}
                    onHoverOut={() => setHoveredTooltip((prev) => (prev === "closed" ? null : prev))}
                  >
                    <Text style={styles.infoIcon}>i</Text>
                  </Pressable>
                </View>
                <Text style={styles.metricValue}>{summary.closed}</Text>
                {hoveredTooltip === "closed" ? <Text style={styles.tooltipText}>{tooltipText("closed")}</Text> : null}
              </View>
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricLabel}>Expired</Text>
                  <Pressable
                    onPress={() => onInfoPress("expired", "Expired")}
                    onHoverIn={() => setHoveredTooltip("expired")}
                    onHoverOut={() => setHoveredTooltip((prev) => (prev === "expired" ? null : prev))}
                  >
                    <Text style={styles.infoIcon}>i</Text>
                  </Pressable>
                </View>
                <Text style={styles.metricValue}>{summary.expired}</Text>
                {hoveredTooltip === "expired" ? <Text style={styles.tooltipText}>{tooltipText("expired")}</Text> : null}
              </View>
            </View>

            <View style={styles.tableCard}>
              <View style={styles.tableHeaderRow}>
                <Text style={styles.tableTitle}>Today Positions</Text>
                <View style={styles.pillRow}>
                  {(["all", "open", "closed"] as PositionStateFilter[]).map((filter) => (
                    <Pressable key={filter} style={[styles.pill, positionFilter === filter && styles.pillActive]} onPress={() => setPositionFilter(filter)}>
                      <Text style={[styles.pillText, positionFilter === filter && styles.pillTextActive]}>{filter.toUpperCase()}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.tableHeadCols}>
                <Text style={[styles.tableCol, styles.colSymbol]}>Symbol</Text>
                <Text style={[styles.tableCol, styles.colState]}>State</Text>
                <Text style={[styles.tableCol, styles.colPnl]}>P/L</Text>
              </View>

              {filteredPositions.length === 0 ? (
                <Text style={styles.emptyText}>No positions for this filter today.</Text>
              ) : (
                filteredPositions.map((item) => {
                  const open = isOpenPosition(item);
                  const pnl = positionPnl(item);
                  return (
                    <View key={item.id} style={styles.tableRow}>
                      <Text style={[styles.tableCol, styles.colSymbol]}>{item.symbol}</Text>
                      <Text style={[styles.tableCol, styles.colState, open ? styles.openState : styles.closedState]}>{open ? "Open" : "Closed"}</Text>
                      <Text style={[styles.tableCol, styles.colPnl, pnl >= 0 ? styles.posPnl : styles.negPnl]}>{pnl >= 0 ? "+" : ""}{usd(pnl)}</Text>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}
      </View>

      {result ? (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>Result: {result.status}</Text>
          <Text>{result.message}</Text>
        </View>
      ) : null}

      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  statusStripLeft: { flex: 1, gap: 2 },
  statusStripSubtext: { color: "#475569", fontSize: 11, fontWeight: "600" },
  statusStripBadges: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusStripText: { color: "#334155", fontSize: 12, fontWeight: "700" },
  statusStripBadge: { fontSize: 11, fontWeight: "800", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, overflow: "hidden" },
  activeBadge: { color: "#166534", backgroundColor: "#dcfce7" },
  pausedBadge: { color: "#64748b", backgroundColor: "#e2e8f0" },
  windowOpenBadge: { color: "#0f766e", backgroundColor: "#ccfbf1" },
  windowClosedBadge: { color: "#7c2d12", backgroundColor: "#ffedd5" },
  sectionWrap: { gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  emptyCard: { borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "white", padding: 12 },
  loadingCard: { borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "white", padding: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  loadingText: { color: "#64748b", fontSize: 12, fontWeight: "600" },
  emptyText: { color: "#64748b" },
  card: { backgroundColor: "white", borderRadius: 14, borderColor: "#e2e8f0", borderWidth: 1, padding: 14, gap: 8 },
  cardTitle: { color: "#0f172a", fontSize: 28, fontWeight: "800" },
  row: { color: "#1f2937", fontWeight: "600" },
  label: { color: "#334155", fontWeight: "600", marginTop: 2 },
  statusText: { color: "#b91c1c", fontWeight: "700" },
  actionButton: { height: 48, borderRadius: 10, backgroundColor: "#166534", alignItems: "center", justifyContent: "center", marginTop: 4 },
  rejectButton: { height: 46, borderRadius: 10, backgroundColor: "#b91c1c", alignItems: "center", justifyContent: "center" },
  actionButtonText: { color: "white", fontWeight: "700" },
  disabled: { opacity: 0.5 },
  snapshotCard: { backgroundColor: "white", borderRadius: 14, borderWidth: 1, borderColor: "#e2e8f0", padding: 12, gap: 10 },
  snapshotHead: { gap: 2 },
  snapshotValue: { color: "#0f172a", fontSize: 24, fontWeight: "800" },
  snapshotMeta: { color: "#475569", fontSize: 12, fontWeight: "600" },
  sparkWrap: { height: 58, borderRadius: 8, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", position: "relative", overflow: "hidden" },
  sparkSegment: { position: "absolute", height: 2, backgroundColor: "#0f766e", borderRadius: 2 },
  pillRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: "#e2e8f0" },
  pillActive: { backgroundColor: "#0f172a" },
  pillText: { color: "#334155", fontWeight: "700", fontSize: 12 },
  pillTextActive: { color: "#ffffff" },
  todayGrid: { flexDirection: "row", gap: 8 },
  metricCard: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "white", padding: 10, gap: 2 },
  metricHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  infoIcon: { width: 16, height: 16, borderRadius: 8, textAlign: "center", fontSize: 11, lineHeight: 16, fontWeight: "700", backgroundColor: "#e2e8f0", color: "#334155" },
  metricLabel: { color: "#64748b", fontSize: 12, fontWeight: "600" },
  metricValue: { color: "#0f172a", fontSize: 22, fontWeight: "800" },
  tooltipText: { color: "#475569", fontSize: 11, fontWeight: "600", marginTop: 4 },
  tableCard: { borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "white", padding: 10, gap: 8 },
  tableHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  tableTitle: { color: "#0f172a", fontWeight: "700", fontSize: 14 },
  tableHeadCols: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingBottom: 6 },
  tableRow: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f8fafc" },
  tableCol: { fontSize: 12, color: "#334155", fontWeight: "600" },
  colSymbol: { flex: 1.3 },
  colState: { flex: 1, textAlign: "center" },
  colPnl: { flex: 1, textAlign: "right" },
  openState: { color: "#1d4ed8" },
  closedState: { color: "#166534" },
  posPnl: { color: "#166534" },
  negPnl: { color: "#b91c1c" },
  result: { backgroundColor: "white", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 12, gap: 6 },
  resultTitle: { fontWeight: "700" },
  error: { color: "#b91c1c", fontSize: 13 },
});
