import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { getActivity } from "@/api/activity";
import { getCurrentProposal, getProposalsHistory } from "@/api/client";
import { ActivityItem, ActivityRange, Proposal } from "@/api/types";
import BrandLockup from "@/components/BrandLockup";
import ErrorState from "@/components/ErrorState";
import { toUnifiedFromActivity, toUnifiedFromPendingProposal, toUnifiedFromProposalHistory, UnifiedActivityItem } from "@/domain/activityTypes";
import { getActiveBrokerMode } from "@/storage/brokerMode";
import { prudexTheme } from "@/theme/prudex";
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
  if (tone === "green") return { fg: prudexTheme.colors.white, bg: prudexTheme.colors.positive };
  if (tone === "amber") return { fg: prudexTheme.colors.white, bg: prudexTheme.colors.warning };
  if (tone === "blue") return { fg: prudexTheme.colors.white, bg: prudexTheme.colors.info };
  return { fg: prudexTheme.colors.textMuted, bg: prudexTheme.colors.border };
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
  const [openDropdown, setOpenDropdown] = useState<"state" | "range" | "sort" | null>(null);

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
  const selectedStateLabel = (primary === "trades" ? tradeFilters : proposalFilters).find((item) => {
    if (primary === "trades") return item.key === tradeFilter;
    return item.key === proposalFilter;
  })?.label;
  const selectedSortLabel = (primary === "trades" ? tradeSorts : proposalSorts).find((item) => item.key === sortBy)?.label;
  const selectedRangeLabel = ranges.find((item) => item.key === range)?.label;
  const stateOptions = primary === "trades" ? tradeFilters : proposalFilters;
  const sortOptions = primary === "trades" ? tradeSorts : proposalSorts;
  const modalTitle = openDropdown === "state" ? "State" : openDropdown === "range" ? "Range" : openDropdown === "sort" ? "Sort" : "";

  return (
    <>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.content}
        data={filtered}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <BrandLockup variant="header" />
            <View style={styles.titleRow}>
              <Text style={styles.title}>Execution history</Text>
              <Text style={styles.modeChip}>{`Alpaca • ${activeMode === "live" ? "Live" : "Paper"}`}</Text>
            </View>

            <View style={styles.metricsCard}>
              <Text style={[styles.metricValue, { color: historyMetrics.realized >= 0 ? prudexTheme.colors.positive : prudexTheme.colors.negative }]}>Realized P/L ({range.toUpperCase()}): {historyMetrics.realized >= 0 ? "+" : ""}{usd(historyMetrics.realized)}</Text>
              <Text style={styles.metricSub}>Closed trades: {historyMetrics.closedCount}</Text>
              {loadingData ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={prudexTheme.colors.textSubtle} />
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

            <View style={styles.dropdownRow}>
              <Pressable style={styles.dropdownField} onPress={() => setOpenDropdown("state")}>
                <Text style={styles.dropdownLabel}>State</Text>
                <Text style={styles.dropdownValue}>{selectedStateLabel ?? "All"}</Text>
              </Pressable>
              <Pressable style={styles.dropdownField} onPress={() => setOpenDropdown("range")}>
                <Text style={styles.dropdownLabel}>Range</Text>
                <Text style={styles.dropdownValue}>{selectedRangeLabel ?? "1W"}</Text>
              </Pressable>
              <Pressable style={styles.dropdownField} onPress={() => setOpenDropdown("sort")}>
                <Text style={styles.dropdownLabel}>Sort</Text>
                <Text style={styles.dropdownValue}>{selectedSortLabel ?? "Newest"}</Text>
              </Pressable>
            </View>

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
          const pnlColor = (item.pnlValue ?? 0) >= 0 ? prudexTheme.colors.positive : prudexTheme.colors.negative;
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

      <Modal transparent visible={openDropdown !== null} animationType="fade" onRequestClose={() => setOpenDropdown(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpenDropdown(null)}>
          <Pressable style={styles.modalSheet} onPress={() => undefined}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            {openDropdown === "state"
              ? stateOptions.map((option) => {
                  const selected = primary === "trades" ? tradeFilter === option.key : proposalFilter === option.key;
                  return (
                    <Pressable
                      key={option.key}
                      style={[styles.modalOption, selected && styles.modalOptionActive]}
                      onPress={() => {
                        if (primary === "trades") setTradeFilter(option.key as TradeFilter);
                        else setProposalFilter(option.key as ProposalFilter);
                        setOpenDropdown(null);
                      }}
                    >
                      <Text style={[styles.modalOptionText, selected && styles.modalOptionTextActive]}>{option.label}</Text>
                    </Pressable>
                  );
                })
              : null}
            {openDropdown === "range"
              ? ranges.map((option) => {
                  const selected = range === option.key;
                  return (
                    <Pressable
                      key={option.key}
                      style={[styles.modalOption, selected && styles.modalOptionActive]}
                      onPress={() => {
                        setRange(option.key);
                        setOpenDropdown(null);
                      }}
                    >
                      <Text style={[styles.modalOptionText, selected && styles.modalOptionTextActive]}>{option.label}</Text>
                    </Pressable>
                  );
                })
              : null}
            {openDropdown === "sort"
              ? sortOptions.map((option) => {
                  const selected = sortBy === option.key;
                  return (
                    <Pressable
                      key={option.key}
                      style={[styles.modalOption, selected && styles.modalOptionActive]}
                      onPress={() => {
                        setSortBy(option.key);
                        setOpenDropdown(null);
                      }}
                    >
                      <Text style={[styles.modalOptionText, selected && styles.modalOptionTextActive]}>{option.label}</Text>
                    </Pressable>
                  );
                })
              : null}
            <Pressable style={styles.modalCancel} onPress={() => setOpenDropdown(null)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: prudexTheme.colors.bg },
  content: { padding: 16, gap: 10, paddingBottom: 24 },
  headerWrap: { gap: 10, marginBottom: 6 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  title: { fontSize: 24, fontWeight: "800", color: prudexTheme.colors.text },
  modeChip: {
    color: prudexTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    backgroundColor: prudexTheme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  metricsCard: {
    backgroundColor: prudexTheme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: prudexTheme.colors.border,
    padding: 12,
    gap: 4,
  },
  metricValue: { fontSize: 16, fontWeight: "800" },
  metricSub: { color: prudexTheme.colors.textMuted, fontSize: 13, fontWeight: "600" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  loadingText: { color: prudexTheme.colors.textSubtle, fontSize: 12, fontWeight: "600" },
  segmentedRow: { flexDirection: "row", gap: 8 },
  segmentedPill: {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    backgroundColor: prudexTheme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentedPillActive: {
    backgroundColor: prudexTheme.colors.primary,
  },
  segmentedText: { color: prudexTheme.colors.textMuted, fontWeight: "800", fontSize: 13 },
  segmentedTextActive: { color: prudexTheme.colors.white },
  dropdownRow: { flexDirection: "row", gap: 8 },
  dropdownField: {
    flex: 1,
    backgroundColor: prudexTheme.colors.surface,
    borderColor: prudexTheme.colors.borderStrong,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 1,
  },
  dropdownLabel: { color: prudexTheme.colors.textSubtle, fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  dropdownValue: { color: prudexTheme.colors.text, fontSize: 13, fontWeight: "700" },
  showing: { color: prudexTheme.colors.textSubtle, fontSize: 12, fontWeight: "600" },
  emptyWrap: {
    backgroundColor: prudexTheme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: prudexTheme.colors.border,
    padding: 18,
  },
  emptyText: { color: prudexTheme.colors.textSubtle },
  card: {
    backgroundColor: prudexTheme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: prudexTheme.colors.border,
    padding: 14,
    gap: 7,
  },
  row1: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardTitle: { color: prudexTheme.colors.text, fontSize: 21, fontWeight: "800" },
  chip: {
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  row2: { color: prudexTheme.colors.textMuted, fontWeight: "700", fontSize: 16 },
  row3: { color: prudexTheme.colors.textSubtle, fontSize: 13, fontWeight: "600" },
  meta: { color: prudexTheme.colors.textSubtle, fontSize: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: prudexTheme.colors.overlay,
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: prudexTheme.colors.surfaceElevated,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 14,
    gap: 8,
  },
  modalTitle: { color: prudexTheme.colors.text, fontSize: 16, fontWeight: "800", marginBottom: 2 },
  modalOption: {
    borderWidth: 1,
    borderColor: prudexTheme.colors.borderStrong,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  modalOptionActive: {
    borderColor: prudexTheme.colors.primary,
    backgroundColor: prudexTheme.colors.surfaceMuted,
  },
  modalOptionText: { color: prudexTheme.colors.textMuted, fontSize: 14, fontWeight: "700" },
  modalOptionTextActive: { color: prudexTheme.colors.primarySoft },
  modalCancel: {
    marginTop: 2,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: prudexTheme.colors.border,
  },
  modalCancelText: { color: prudexTheme.colors.text, fontWeight: "700", fontSize: 14 },
});
