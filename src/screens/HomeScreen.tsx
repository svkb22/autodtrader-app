import React, { useCallback, useMemo, useState } from "react";
import { LayoutChangeEvent, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { getBrokerAccount, getCurrentProposal, getExecutionSummary, getOrderOutcomes, getRecentOrders, getRisk, toApiError } from "@/api/client";
import { BrokerAccount, ExecutionSummary, Order, OrderOutcome, Proposal, RiskProfile } from "@/api/types";
import Countdown from "@/components/Countdown";
import ErrorState from "@/components/ErrorState";
import ProposalCard from "@/components/ProposalCard";
import { dateTime, usd, usdCompact } from "@/utils/format";

type Nav = {
  navigate: (
    screen: "Proposal",
    params?: { proposalId?: string }
  ) => void;
};

export default function HomeScreen(): React.JSX.Element {
  type ChartRange = "1D" | "1W" | "1M" | "3M" | "YTD" | "1Y" | "ALL";
  type ChartPoint = { label: string; value: number };

  const navigation = useNavigation<Nav>();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [risk, setRisk] = useState<RiskProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [brokerAccount, setBrokerAccount] = useState<BrokerAccount | null>(null);
  const [todayUnrealized, setTodayUnrealized] = useState<number>(0);
  const [todayRealized, setTodayRealized] = useState<number>(0);
  const [todayTrades, setTodayTrades] = useState<number>(0);
  const [outcomesMap, setOutcomesMap] = useState<Record<string, OrderOutcome>>({});
  const [chartRange, setChartRange] = useState<ChartRange>("1D");
  const [chartWidth, setChartWidth] = useState<number>(0);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isSameDay = (isoDate: string): boolean => {
    const a = new Date(isoDate);
    const b = new Date();
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  };

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [currentProposal, recentOrders, account, outcomes, riskProfile, execSummary] = await Promise.all([
        getCurrentProposal(),
        getRecentOrders(),
        getBrokerAccount(),
        getOrderOutcomes(),
        getRisk(),
        getExecutionSummary("1d").catch(() => null as ExecutionSummary | null),
      ]);
      setProposal(currentProposal);
      setOrders(recentOrders);
      setBrokerAccount(account);
      setRisk(riskProfile);
      setOutcomesMap(outcomes);

      let unrealized = 0;
      let realized = Number(execSummary?.total_realized_pnl ?? 0);
      let tradesToday = 0;
      for (const order of recentOrders) {
        if (!isSameDay(order.submitted_at)) continue;
        tradesToday += 1;
        const outcome: OrderOutcome | undefined = outcomes[order.id];
        if (!outcome) continue;
        unrealized += outcome.unrealized_pnl;
        // Realized P/L comes from execution analytics summary; keep only unrealized here.
      }

      setTodayTrades(tradesToday);
      setTodayUnrealized(Number(unrealized.toFixed(2)));
      setTodayRealized(Number(realized.toFixed(2)));
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const systemStatus = risk?.kill_switch_enabled ? "Paused" : "Active";
  const systemStatusColor = risk?.kill_switch_enabled ? "#64748b" : "#166534";
  const brokerBuyingPower = brokerAccount ? Number(brokerAccount.buying_power || 0) : 0;
  const brokerEquity = brokerAccount ? Number(brokerAccount.equity || 0) : 0;
  const appBudget = risk
    ? risk.capital_limit_mode === "usd"
      ? Math.min(Math.max(risk.capital_limit_value, 0), Math.max(brokerEquity, 0))
      : Math.max(brokerEquity, 0) * Math.max(0, Math.min(1, risk.capital_limit_value))
    : 0;
  const dayNetPnl = todayRealized + todayUnrealized;
  const dayNetPnlText = `${dayNetPnl >= 0 ? "+" : "-"}${usd(Math.abs(dayNetPnl))}`;
  const dayNetPnlPct = appBudget > 0 ? dayNetPnl / appBudget : 0;
  const dayNetPnlPctText = `${dayNetPnlPct >= 0 ? "+" : ""}${(dayNetPnlPct * 100).toFixed(2)}%`;
  const currentInvestmentValue = appBudget + todayRealized + todayUnrealized;
  const valueColor = "#0f172a";
  const pnlColor = dayNetPnl >= 0 ? "#15803d" : "#b91c1c";
  const recentOrderPreview = orders.slice(0, 3);

  const chartSeries = useMemo<ChartPoint[]>(() => {
    const now = new Date();
    const base = appBudget || 0;

    const makeBuckets = (): Array<{ key: string; label: string; start: Date; end: Date }> => {
      if (chartRange === "1D") {
        const result: Array<{ key: string; label: string; start: Date; end: Date }> = [];
        for (let i = 7; i >= 0; i -= 1) {
          const end = new Date(now.getTime() - i * 3 * 60 * 60 * 1000);
          const start = new Date(end.getTime() - 3 * 60 * 60 * 1000);
          const label = `${end.getHours().toString().padStart(2, "0")}:00`;
          result.push({ key: label, label, start, end });
        }
        return result;
      }

      if (chartRange === "1W") {
        const result: Array<{ key: string; label: string; start: Date; end: Date }> = [];
        for (let i = 6; i >= 0; i -= 1) {
          const day = new Date(now);
          day.setDate(now.getDate() - i);
          const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0);
          const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
          const label = day.toLocaleDateString("en-US", { weekday: "short" });
          result.push({ key: `${day.toISOString().slice(0, 10)}`, label, start, end });
        }
        return result;
      }

      if (chartRange === "1M") {
        const result: Array<{ key: string; label: string; start: Date; end: Date }> = [];
        for (let i = 29; i >= 0; i -= 1) {
          const day = new Date(now);
          day.setDate(now.getDate() - i);
          const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0);
          const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
          const label = day.getDate().toString();
          result.push({ key: `${day.toISOString().slice(0, 10)}`, label, start, end });
        }
        return result;
      }

      if (chartRange === "3M") {
        const result: Array<{ key: string; label: string; start: Date; end: Date }> = [];
        for (let i = 11; i >= 0; i -= 1) {
          const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
          const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
          const label = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          result.push({ key: `${end.toISOString().slice(0, 10)}-wk`, label, start, end });
        }
        return result;
      }

      if (chartRange === "YTD") {
        const result: Array<{ key: string; label: string; start: Date; end: Date }> = [];
        for (let month = 0; month <= now.getMonth(); month += 1) {
          const start = new Date(now.getFullYear(), month, 1, 0, 0, 0);
          const end = new Date(now.getFullYear(), month + 1, 0, 23, 59, 59);
          const label = start.toLocaleDateString("en-US", { month: "short" });
          result.push({ key: `${now.getFullYear()}-${month + 1}`, label, start, end });
        }
        return result;
      }

      if (chartRange === "1Y") {
        const result: Array<{ key: string; label: string; start: Date; end: Date }> = [];
        for (let i = 11; i >= 0; i -= 1) {
          const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const start = new Date(month.getFullYear(), month.getMonth(), 1, 0, 0, 0);
          const end = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);
          const label = month.toLocaleDateString("en-US", { month: "short" });
          result.push({ key: `${month.getFullYear()}-${month.getMonth() + 1}`, label, start, end });
        }
        return result;
      }

      const earliestOrderTs = orders.length > 0 ? Math.min(...orders.map((o) => Date.parse(o.submitted_at))) : Date.now();
      const earliest = new Date(Number.isFinite(earliestOrderTs) ? earliestOrderTs : Date.now());
      const monthsDiff = Math.max(
        1,
        (now.getFullYear() - earliest.getFullYear()) * 12 + (now.getMonth() - earliest.getMonth()) + 1
      );
      const result: Array<{ key: string; label: string; start: Date; end: Date }> = [];
      for (let i = monthsDiff - 1; i >= 0; i -= 1) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = new Date(month.getFullYear(), month.getMonth(), 1, 0, 0, 0);
        const end = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);
        const label = month.toLocaleDateString("en-US", { month: "short" });
        result.push({ key: `${month.getFullYear()}-${month.getMonth() + 1}`, label, start, end });
      }
      return result;
    };

    const buckets = makeBuckets();
    const pnlByBucket: Record<string, number> = {};
    for (const order of orders) {
      const ts = new Date(order.submitted_at);
      const outcome = outcomesMap[order.id];
      const pnl = outcome ? outcome.realized_pnl + outcome.unrealized_pnl : 0;
      const bucket = buckets.find((b) => ts >= b.start && ts <= b.end);
      if (!bucket) continue;
      pnlByBucket[bucket.key] = (pnlByBucket[bucket.key] ?? 0) + pnl;
    }

    let running = base;
    const points = buckets.map((bucket) => {
      running += pnlByBucket[bucket.key] ?? 0;
      return { label: bucket.label, value: Number(running.toFixed(2)) };
    });
    return points.length > 0 ? points : [{ label: "Now", value: base }];
  }, [appBudget, chartRange, orders, outcomesMap]);

  const minCap = Math.min(...chartSeries.map((p) => p.value));
  const maxCap = Math.max(...chartSeries.map((p) => p.value));
  const capRange = Math.max(maxCap - minCap, 1);
  const chartHeight = 120;
  const hasEnoughChartData = chartSeries.length >= 8;

  const plotPoints = useMemo(() => {
    if (chartSeries.length === 0 || chartWidth <= 0) return [];
    const span = Math.max(chartSeries.length - 1, 1);
    return chartSeries.map((point, index) => {
      const x = (index / span) * Math.max(chartWidth - 1, 1);
      const y = ((maxCap - point.value) / capRange) * Math.max(chartHeight - 1, 1);
      return { x, y, label: point.label, value: point.value };
    });
  }, [capRange, chartSeries, chartHeight, chartWidth, maxCap]);

  const onChartLayout = (event: LayoutChangeEvent) => {
    const next = Math.max(1, Math.floor(event.nativeEvent.layout.width));
    if (next !== chartWidth) setChartWidth(next);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
    >
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      <View style={styles.capitalCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroLeft}>
            <View style={styles.valueRow}>
              <Text style={[styles.capitalValueTop, { color: valueColor }]}>{usd(currentInvestmentValue)}</Text>
            </View>
            <Text style={[styles.dayChangeText, { color: pnlColor }]}>
              {dayNetPnlText} ({dayNetPnlPctText}) Today
            </Text>
          </View>
          <Text style={[styles.statusChip, { color: systemStatusColor, backgroundColor: risk?.kill_switch_enabled ? "#e2e8f0" : "#dcfce7" }]}>
            {systemStatus}
          </Text>
        </View>

        <View style={styles.rangeRow}>
          {(["1D", "1W", "1M", "3M", "YTD", "1Y", "ALL"] as ChartRange[]).map((range) => (
            <Pressable key={range} style={[styles.rangePill, chartRange === range && styles.rangePillActive]} onPress={() => setChartRange(range)}>
              <Text style={[styles.rangeText, chartRange === range && styles.rangeTextActive]}>{range}</Text>
            </Pressable>
          ))}
        </View>
        {hasEnoughChartData ? (
          <>
            <View style={styles.chartCanvas} onLayout={onChartLayout}>
              {plotPoints.length > 0 ? (
                <View
                  style={[
                    styles.chartBaseline,
                    { top: plotPoints[0].y },
                  ]}
                />
              ) : null}
              {plotPoints.map((point, index) => {
                if (index === 0) return null;
                const prev = plotPoints[index - 1];
                const dx = point.x - prev.x;
                const dy = point.y - prev.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);
                return (
                  <View
                    key={`seg-${index}`}
                    style={[
                      styles.chartSegment,
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
              {plotPoints.length > 0 ? (
                <View
                  style={[
                    styles.chartEndpointDot,
                    {
                      left: plotPoints[plotPoints.length - 1].x - 2.5,
                      top: plotPoints[plotPoints.length - 1].y - 2.5,
                    },
                  ]}
                />
              ) : null}
            </View>
            <View style={styles.chartLabelsRow}>
              {chartSeries.length > 0 ? (
                <Text style={styles.sparklineDay}>{chartSeries[0].label}</Text>
              ) : (
                <Text style={styles.sparklineDay}> </Text>
              )}
              {chartSeries.length > 2 ? (
                <Text style={styles.sparklineDay}>{chartSeries[Math.floor(chartSeries.length / 2)].label}</Text>
              ) : (
                <Text style={styles.sparklineDay}> </Text>
              )}
              {chartSeries.length > 1 ? (
                <Text style={styles.sparklineDay}>{chartSeries[chartSeries.length - 1].label}</Text>
              ) : (
                <Text style={styles.sparklineDay}> </Text>
              )}
            </View>
          </>
        ) : (
          <Text style={styles.subtle}>Chart hidden until enough data is available.</Text>
        )}
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Buying Power</Text>
        <Text style={styles.metaValue}>{usdCompact(brokerBuyingPower)}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Broker Equity</Text>
        <Text style={styles.metaValue}>{usdCompact(brokerEquity)}</Text>
      </View>

      <Text style={styles.sectionTitle}>Today Summary</Text>
      <View style={styles.capitalCard}>
        <Text style={styles.capitalLabel}>Today's Trades</Text>
        <Text style={styles.capitalValueSmall}>{todayTrades}/{risk?.max_trades_per_day ?? 0}</Text>
      </View>

      <Text style={styles.sectionTitle}>Current Proposal</Text>
      {proposal ? (
        <View style={styles.block}>
          <ProposalCard proposal={proposal} availableCapital={brokerAccount && risk ? appBudget : null} onPress={() => navigation.navigate("Proposal", { proposalId: proposal.id })} />
          <Countdown expiresAtISO={proposal.expires_at} />
        </View>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No high-quality setup detected.</Text>
          <Pressable style={styles.secondary} onPress={load}>
            <Text style={styles.secondaryText}>Refresh</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.sectionTitle}>Recent Orders</Text>
      {recentOrderPreview.length === 0 ? (
        <Text style={styles.subtle}>No recent orders</Text>
      ) : (
        recentOrderPreview.map((order) => (
          <View key={order.id} style={styles.orderCard}>
            <Text style={styles.orderTitle}>
              {order.symbol} • {order.status}
            </Text>
            <Text style={styles.subtle}>{dateTime(order.submitted_at)}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  valueRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 },
  heroLeft: { gap: 2 },
  capitalCard: {
    backgroundColor: "white",
    borderColor: "#f1f5f9",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 8,
  },
  metaRow: {
    backgroundColor: "white",
    borderColor: "#f1f5f9",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLabel: { color: "#64748b", fontSize: 12, fontWeight: "600" },
  metaValue: { color: "#0f172a", fontSize: 15, fontWeight: "700" },
  capitalLabel: { color: "#64748b", fontSize: 12, fontWeight: "600" },
  capitalValueTop: { fontSize: 38, fontWeight: "800", letterSpacing: -0.8 },
  dayPnlText: { fontSize: 18, fontWeight: "700" },
  dayChangeText: { fontSize: 13, fontWeight: "700" },
  statusValue: { fontSize: 20, fontWeight: "800" },
  statusTextSmall: { fontSize: 12, fontWeight: "700", marginTop: 2 },
  good: { color: "#166534" },
  bad: { color: "#b91c1c" },
  capitalValue: { color: "#0f172a", fontSize: 22, fontWeight: "700" },
  capitalValueSmall: { color: "#0f172a", fontSize: 18, fontWeight: "700" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusChip: { fontSize: 12, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  rangeRow: { flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" },
  rangePill: {
    borderWidth: 0,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "transparent",
  },
  rangePillActive: { backgroundColor: "#0f172a" },
  rangeText: { fontSize: 11, fontWeight: "700", color: "#64748b" },
  rangeTextActive: { color: "#ffffff" },
  chartCanvas: {
    position: "relative",
    height: 120,
    marginTop: 8,
  },
  chartBaseline: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    borderStyle: "dashed",
  },
  chartSegment: {
    position: "absolute",
    height: 1,
    backgroundColor: "#334155",
    borderRadius: 999,
  },
  chartEndpointDot: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#334155",
  },
  chartLabelsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  sparklineDay: { color: "#64748b", fontSize: 10 },
  block: { gap: 12 },
  secondary: {
    borderWidth: 1,
    borderColor: "#94a3b8",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 8,
  },
  secondaryText: { color: "#334155", fontWeight: "700" },
  empty: {
    backgroundColor: "white",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  emptyText: { color: "#334155" },
  subtle: { color: "#64748b" },
  orderCard: {
    backgroundColor: "white",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  orderTitle: { fontWeight: "700", color: "#1f2937" },
});
