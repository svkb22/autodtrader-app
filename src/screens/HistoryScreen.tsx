import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { getActivity } from "@/api/activity";
import { getCurrentProposal, getProposalsHistory } from "@/api/client";
import { ActivityItem, ActivityRange, Proposal } from "@/api/types";
import ErrorState from "@/components/ErrorState";
import { toUnifiedFromActivity, toUnifiedFromPendingProposal, toUnifiedFromProposalHistory, UnifiedActivityItem } from "@/domain/activityTypes";
import { getActiveBrokerMode } from "@/storage/brokerMode";
import { usd } from "@/utils/format";

type PrimaryFilter = "trades" | "proposals";
type TradeFilter = "open" | "closed" | "all";
type ProposalFilter = "pending" | "expired" | "rejected" | "all";
type SortKey = "date_desc" | "date_asc" | "pnl_desc" | "pnl_asc";

type Nav = {
  navigate: (screen: "ProposalDetail", params: { proposalId: string }) => void;
};

const primaryFilters: Array<{ key: PrimaryFilter; label: string }> = [
  { key: "trades", label: "Trades" },
  { key: "proposals", label: "Proposals" },
];

const tradeFilters: Array<{ key: TradeFilter; label: string }> = [
  { key: "open", label: "Open" },
  { key: "closed", label: "Closed" },
  { key: "all", label: "All" },
];

const proposalFilters: Array<{ key: ProposalFilter; label: string }> = [
  { key: "pending", label: "Pending" },
  { key: "expired", label: "Expired" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

const ranges: Array<{ key: ActivityRange; label: string }> = [
  { key: "1w", label: "1W" },
  { key: "1m", label: "1M" },
  { key: "all", label: "All" },
];

const tradeSorts: Array<{ key: SortKey; label: string }> = [
  { key: "date_desc", label: "Newest" },
  { key: "date_asc", label: "Oldest" },
  { key: "pnl_desc", label: "P/L High-Low" },
  { key: "pnl_asc", label: "P/L Low-High" },
];

const proposalSorts: Array<{ key: SortKey; label: string }> = [
  { key: "date_desc", label: "Newest" },
  { key: "date_asc", label: "Oldest" },
];

function chipToneColor(tone: UnifiedActivityItem["statusTone"]): { fg: string; bg: string } {
  if (tone === "green") return { fg: "#166534", bg: "#dcfce7" };
  if (tone === "amber") return { fg: "#b45309", bg: "#fef3c7" };
  if (tone === "blue") return { fg: "#1d4ed8", bg: "#dbeafe" };
  return { fg: "#475569", bg: "#e2e8f0" };
}

function formatDateCompact(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const month = d.toLocaleDateString(undefined, { month: "short" });
  const day = d.getDate();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${month} ${day} • ${time}`;
}

function isOpenTrade(item: UnifiedActivityItem): boolean {
  return item.kind === "TRADE" && item.statusLabel === "Open Position";
}

function isClosedTrade(item: UnifiedActivityItem): boolean {
  return item.kind === "TRADE" && item.statusLabel === "Closed Position";
}

function getRawStatus(item: UnifiedActivityItem): string {
  const raw = item.raw as { status?: string };
  return raw.status ?? "";
}

function isPendingProposal(item: UnifiedActivityItem): boolean {
  return item.kind === "PROPOSAL" && (item.statusLabel === "Pending" || getRawStatus(item) === "pending");
}

export default function HistoryScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const [primary, setPrimary] = useState<PrimaryFilter>("trades");
  const [tradeFilter, setTradeFilter] = useState<TradeFilter>("open");
  const [proposalFilter, setProposalFilter] = useState<ProposalFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("date_desc");
  const [range, setRange] = useState<ActivityRange>("1w");
  const [activeMode, setActiveMode] = useState<"paper" | "live">("paper");
  const [items, setItems] = useState<UnifiedActivityItem[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    setLoadingData(true);
    setError(null);
    try {
      const [activity, proposals, mode, currentProposal] = await Promise.all([
        getActivity({ status: "all", range, limit: 120, includeOverview: false }),
        getProposalsHistory(200),
        getActiveBrokerMode(),
        getCurrentProposal().catch(() => null),
      ]);
      const tradeMapped = activity.items.map((item: ActivityItem) => toUnifiedFromActivity(item));
      const proposalMapped = proposals.items.map((item) => toUnifiedFromProposalHistory(item));
      const pendingProposal =
        currentProposal && currentProposal.status === "pending"
          ? toUnifiedFromPendingProposal(currentProposal as Proposal)
          : null;
      const merged = [...tradeMapped, ...proposalMapped, ...(pendingProposal ? [pendingProposal] : [])];
      const deduped = new Map<string, UnifiedActivityItem>();
      for (const item of merged) {
        deduped.set(`${item.kind}:${item.id}`, item);
      }
      const sorted = [...deduped.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      setItems(sorted);
      setActiveMode(mode);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not load history.";
      setError(message);
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  }, [range]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const filtered = useMemo(() => {
    let next = items;

    if (primary === "trades") {
      next = next.filter((item) => item.kind === "TRADE");
      if (tradeFilter === "open") next = next.filter(isOpenTrade);
      if (tradeFilter === "closed") next = next.filter(isClosedTrade);
    } else {
      next = next.filter((item) => item.kind === "PROPOSAL");
      if (proposalFilter === "pending") next = next.filter(isPendingProposal);
      if (proposalFilter === "expired") next = next.filter((item) => getRawStatus(item) === "expired");
      if (proposalFilter === "rejected") next = next.filter((item) => getRawStatus(item) === "rejected");
    }

    if (sortBy === "date_desc") {
      next = [...next].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    } else if (sortBy === "date_asc") {
      next = [...next].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    } else if (primary === "trades") {
      const score = (item: UnifiedActivityItem) => (typeof item.pnlValue === "number" ? item.pnlValue : 0);
      next = [...next].sort((a, b) => (sortBy === "pnl_desc" ? score(b) - score(a) : score(a) - score(b)));
    }

    return next;
  }, [items, primary, proposalFilter, sortBy, tradeFilter]);

  const showingLabel = useMemo(() => {
    const p = primary === "trades" ? "Trades" : "Proposals";
    const s = primary === "trades" ? tradeFilter : proposalFilter;
    const sortLabel = (
      (primary === "trades" ? tradeSorts : proposalSorts).find((item) => item.key === sortBy)?.label ?? "Newest"
    );
    return `Showing: ${p} • ${s.charAt(0).toUpperCase()}${s.slice(1)} • ${range.toUpperCase()} • Sort ${sortLabel}`;
  }, [primary, proposalFilter, range, sortBy, tradeFilter]);

  const historyMetrics = useMemo(() => {
    const closedTrades = items.filter((item) => item.kind === "TRADE" && item.statusLabel === "Closed Position");
    const realized = closedTrades.reduce((sum, item) => sum + (typeof item.pnlValue === "number" ? item.pnlValue : 0), 0);
    return { realized, closedCount: closedTrades.length };
  }, [items]);

  const emptyLabel = primary === "trades" ? "No trades match this filter." : "No proposals match this filter.";

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={filtered}
      keyExtractor={(item) => `${item.kind}-${item.id}`}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      ListHeaderComponent={
        <View style={styles.headerWrap}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>History</Text>
            <Text style={styles.modeChip}>{`Alpaca • ${activeMode === "live" ? "Live" : "Paper"}`}</Text>
          </View>

          <View style={styles.metricsCard}>
            <Text style={[styles.metricValue, { color: historyMetrics.realized >= 0 ? "#166534" : "#b91c1c" }]}>Realized P/L ({range.toUpperCase()}): {historyMetrics.realized >= 0 ? "+" : ""}{usd(historyMetrics.realized)}</Text>
            <Text style={styles.metricSub}>Closed trades: {historyMetrics.closedCount}</Text>
            {loadingData ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#64748b" />
                <Text style={styles.loadingText}>Updating range...</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.segmentedRow}>
            {primaryFilters.map((filter) => (
              <Pressable key={filter.key} style={[styles.segmentedPill, primary === filter.key && styles.segmentedPillActive]} onPress={() => setPrimary(filter.key)}>
                <Text style={[styles.segmentedText, primary === filter.key && styles.segmentedTextActive]}>{filter.label}</Text>
              </Pressable>
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.controlRow}>
            <Text style={styles.controlLabel}>State</Text>
            {(primary === "trades" ? tradeFilters : proposalFilters).map((filter) => {
              const key = filter.key as string;
              const selected = primary === "trades" ? tradeFilter === key : proposalFilter === key;
              return (
                <Pressable
                  key={filter.key}
                  style={[styles.pill, selected && styles.pillActive]}
                  onPress={() => {
                    if (primary === "trades") setTradeFilter(key as TradeFilter);
                    else setProposalFilter(key as ProposalFilter);
                  }}
                >
                  <Text style={[styles.pillText, selected && styles.pillTextActive]}>{filter.label}</Text>
                </Pressable>
              );
            })}

            <View style={styles.controlDivider} />
            <Text style={styles.controlLabel}>Range</Text>
            {ranges.map((filter) => (
              <Pressable key={filter.key} style={[styles.pill, range === filter.key && styles.pillActive]} onPress={() => setRange(filter.key)}>
                <Text style={[styles.pillText, range === filter.key && styles.pillTextActive]}>{filter.label}</Text>
              </Pressable>
            ))}

            <View style={styles.controlDivider} />
            <Text style={styles.controlLabel}>Sort</Text>
            {(primary === "trades" ? tradeSorts : proposalSorts).map((sort) => (
              <Pressable key={sort.key} style={[styles.pill, sortBy === sort.key && styles.pillActive]} onPress={() => setSortBy(sort.key)}>
                <Text style={[styles.pillText, sortBy === sort.key && styles.pillTextActive]}>{sort.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.showing}>{showingLabel}</Text>
          {error ? <ErrorState message={error} onRetry={load} /> : null}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>{emptyLabel}</Text>
        </View>
      }
      renderItem={({ item }) => {
        const tone = chipToneColor(item.statusTone);
        const pnlColor = (item.pnlValue ?? 0) >= 0 ? "#166534" : "#b91c1c";
        const pnlText = typeof item.pnlValue === "number" ? `${item.pnlValue >= 0 ? "+" : ""}${usd(item.pnlValue)}` : null;
        const riskText = typeof item.riskUsedUsd === "number" ? usd(item.riskUsedUsd) : "-";

        return (
          <Pressable
            style={styles.card}
            onPress={() => {
              if (item.kind === "PROPOSAL") {
                navigation.navigate("ProposalDetail", { proposalId: item.id });
              }
            }}
          >
            <View style={styles.row1}>
              <Text style={styles.cardTitle}>{item.symbol} • {item.side === "long" ? "Long" : "Short"}</Text>
              <Text style={[styles.chip, { color: tone.fg, backgroundColor: tone.bg }]}>{item.statusLabel}</Text>
            </View>

            <Text style={styles.row2}>
              {item.summary}
              {pnlText ? <Text style={{ color: pnlColor }}>{` • ${pnlText}`}</Text> : null}
            </Text>

            <Text style={styles.row3}>{`${formatDateCompact(item.createdAt)} • Risk ${riskText}`}</Text>
            {item.entryPrice ? <Text style={styles.meta}>Entry {usd(item.entryPrice)}{item.exitPrice ? ` → Exit ${usd(item.exitPrice)}` : ""}</Text> : null}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  content: { padding: 16, gap: 10, paddingBottom: 24 },
  headerWrap: { gap: 10, marginBottom: 6 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  title: { fontSize: 24, fontWeight: "800", color: "#0f172a" },
  modeChip: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "700",
    backgroundColor: "#e2e8f0",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  metricsCard: {
    backgroundColor: "white",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    gap: 4,
  },
  metricValue: { fontSize: 16, fontWeight: "800" },
  metricSub: { color: "#334155", fontSize: 13, fontWeight: "600" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  loadingText: { color: "#64748b", fontSize: 12, fontWeight: "600" },
  segmentedRow: { flexDirection: "row", gap: 8 },
  segmentedPill: {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  segmentedPillActive: {
    backgroundColor: "#0f172a",
  },
  segmentedText: { color: "#334155", fontWeight: "800", fontSize: 13 },
  segmentedTextActive: { color: "#ffffff" },
  controlRow: { flexDirection: "row", gap: 8, alignItems: "center", paddingRight: 12 },
  controlLabel: { color: "#64748b", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  controlDivider: { width: 1, height: 16, backgroundColor: "#cbd5e1", marginHorizontal: 2 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
  },
  pillActive: {
    backgroundColor: "#0f172a",
  },
  pillText: { color: "#334155", fontWeight: "700", fontSize: 12 },
  pillTextActive: { color: "#ffffff" },
  showing: { color: "#475569", fontSize: 12, fontWeight: "600" },
  emptyWrap: {
    backgroundColor: "white",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 18,
  },
  emptyText: { color: "#64748b" },
  card: {
    backgroundColor: "white",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#dbe3ef",
    padding: 14,
    gap: 7,
  },
  row1: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardTitle: { color: "#0f172a", fontSize: 21, fontWeight: "800" },
  chip: {
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  row2: { color: "#334155", fontWeight: "700", fontSize: 16 },
  row3: { color: "#64748b", fontSize: 13, fontWeight: "600" },
  meta: { color: "#64748b", fontSize: 12 },
});
