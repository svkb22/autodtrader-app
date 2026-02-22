import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { getActivity } from "@/api/activity";
import { ActivityItem, ActivityRange, ActivityStatus } from "@/api/types";
import ErrorState from "@/components/ErrorState";
import { dateTime, usd } from "@/utils/format";

type FilterStatus = "all" | ActivityStatus;

const statusFilters: Array<{ key: FilterStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "executed", label: "Executed" },
  { key: "expired", label: "Expired" },
  { key: "rejected", label: "Rejected" },
  { key: "blocked", label: "Blocked" },
  { key: "shadow", label: "Debug" },
];

const rangeFilters: Array<{ key: ActivityRange; label: string }> = [
  { key: "1w", label: "1W" },
  { key: "1m", label: "1M" },
  { key: "all", label: "All" },
];

const SHOW_SAMPLE_PREVIEW = true;

const sampleCards: ActivityItem[] = [
  {
    id: "sample-executed",
    symbol: "AAPL",
    side: "long",
    status: "executed",
    created_at: new Date().toISOString(),
    decided_at: new Date().toISOString(),
    risk_used_usd: 85,
    pnl_total: 42.1,
    approved_mode: "manual",
    reason: "Filled and closed",
    entry_price: 190.2,
    stop_loss_price: 188.7,
    take_profit_price: 193.6,
    filled_avg_price: 190.35,
    order_status: "filled",
  },
  {
    id: "sample-expired",
    symbol: "NVDA",
    side: "long",
    status: "expired",
    created_at: new Date(Date.now() - 86_400_000).toISOString(),
    expires_at: new Date(Date.now() - 86_280_000).toISOString(),
    risk_used_usd: 70,
    approved_mode: "manual",
    reason: "Approval window ended",
  },
  {
    id: "sample-rejected",
    symbol: "MSFT",
    side: "long",
    status: "rejected",
    created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    decided_at: new Date(Date.now() - 2 * 86_340_000).toISOString(),
    risk_used_usd: 60,
    approved_mode: "manual",
    reason: "You declined",
    rejected_by: "user",
    entry_price: 412.3,
    stop_loss_price: 409.9,
    take_profit_price: 417.1,
  },
  {
    id: "sample-blocked",
    symbol: "AMD",
    side: "long",
    status: "blocked",
    created_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    risk_used_usd: 50,
    approved_mode: "auto",
    reason: "Daily loss cap reached",
    blocked_reason: "daily_loss_cap",
    entry_price: 168.2,
    stop_loss_price: 166.9,
    take_profit_price: 170.8,
  },
  {
    id: "sample-shadow",
    symbol: "PANW",
    side: "long",
    status: "shadow",
    created_at: new Date(Date.now() - 4 * 86_400_000).toISOString(),
    expires_at: new Date(Date.now() - 4 * 86_220_000).toISOString(),
    risk_used_usd: 45,
    reason: "Debug shadow proposal (non-actionable)",
    entry_price: 385.2,
    stop_loss_price: 382.1,
    take_profit_price: 391.4,
    order_status: null,
    rationale: ["Momentum close to threshold", "Spread acceptable", "Rejected by rel vol gate"],
  },
];

function statusColor(status: ActivityStatus): string {
  if (status === "executed") return "#166534";
  if (status === "expired") return "#475569";
  if (status === "rejected") return "#b45309";
  if (status === "shadow") return "#7c3aed";
  return "#1d4ed8";
}

function statusLabel(status: ActivityStatus): string {
  if (status === "executed") return "Executed";
  if (status === "expired") return "Expired";
  if (status === "rejected") return "Rejected";
  if (status === "shadow") return "Shadow";
  return "Blocked";
}

function summaryLine(item: ActivityItem): string {
  if (item.status === "executed") {
    if (typeof item.pnl_total === "number") {
      const sign = item.pnl_total >= 0 ? "+" : "";
      return `Executed - ${sign}${usd(item.pnl_total).replace("$", "$")}`;
    }
    return "Executed";
  }
  if (item.status === "expired") return "Expired - Approval window ended";
  if (item.status === "rejected") return "Rejected - You declined";
  if (item.status === "shadow") return `Shadow (Debug) - ${item.reason ?? "Non-actionable preview"}`;
  return `Blocked - ${item.reason ?? "Blocked by safeguards"}`;
}

function formatDateCompact(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const month = d.toLocaleDateString(undefined, { month: "short" });
  const day = d.getDate();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${month} ${day} - ${time}`;
}

export default function ActivityScreen(): React.JSX.Element {
  const [status, setStatus] = useState<FilterStatus>("all");
  const [range, setRange] = useState<ActivityRange>("1w");
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [selected, setSelected] = useState<ActivityItem | null>(null);

  const loadActivity = useCallback(
    async (opts?: { append?: boolean; cursor?: string | null }) => {
      const append = opts?.append ?? false;
      const cursor = opts?.cursor ?? null;

      if (append) setLoadingMore(true);
      else setLoading(true);

      setError(null);
      try {
        const res = await getActivity({
          status,
          range,
          limit: 20,
          cursor,
        });
        setItems((prev) => (append ? [...prev, ...res.items] : res.items));
        setNextCursor(res.next_cursor ?? null);
        setLastUpdated(new Date().toISOString());
      } catch (e) {
        const message = e instanceof Error ? e.message : "Could not load activity.";
        setError(message);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [range, status]
  );

  useFocusEffect(
    useCallback(() => {
      void loadActivity({ append: false, cursor: null });
    }, [loadActivity])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActivity({ append: false, cursor: null });
    setRefreshing(false);
  };

  const onEndReached = async () => {
    if (!nextCursor || loadingMore || loading) return;
    await loadActivity({ append: true, cursor: nextCursor });
  };

  const emptyText = useMemo(() => {
    if (status === "executed") return "No executed trades for this range.";
    if (status === "expired") return "No expired proposals for this range.";
    if (status === "rejected") return "No rejected proposals for this range.";
    if (status === "blocked") return "No blocked proposals for this range.";
    if (status === "shadow") return "No debug shadow proposals for this range.";
    return "No activity yet for this range.";
  }, [status]);

  const renderItem = ({ item }: { item: ActivityItem }) => {
    const summary = summaryLine(item);
    const isPnl = item.status === "executed" && typeof item.pnl_total === "number";

    return (
      <Pressable style={styles.card} onPress={() => setSelected(item)}>
        <View style={styles.rowBetween}>
          <Text style={styles.row1}>{`${item.symbol} - ${item.side === "long" ? "Long" : "Short"}`}</Text>
          <View style={[styles.statusChip, { borderColor: statusColor(item.status) }]}>
            <Text style={[styles.statusChipText, { color: statusColor(item.status) }]}>{statusLabel(item.status)}</Text>
          </View>
        </View>

        <Text style={[styles.row2, isPnl ? { color: (item.pnl_total ?? 0) >= 0 ? "#166534" : "#b91c1c" } : null]}>{summary}</Text>

        <View style={styles.rowBetween}>
          <Text style={styles.row3}>{formatDateCompact(item.created_at)}</Text>
          <Text style={styles.row3}>{`Risk ${typeof item.risk_used_usd === "number" ? usd(item.risk_used_usd) : "-"}`}</Text>
        </View>
      </Pressable>
    );
  };

  const renderSamplePreview = () => {
    if (!SHOW_SAMPLE_PREVIEW) return null;
    const visibleSamples = sampleCards.filter((item) => (status === "all" ? true : item.status === status));

    return (
      <View style={styles.sampleSection}>
        <Text style={styles.sampleSectionTitle}>Sample Preview</Text>
        {visibleSamples.map((item) => {
          const summary = summaryLine(item);
          const isPnl = item.status === "executed" && typeof item.pnl_total === "number";
          return (
            <Pressable key={item.id} style={[styles.card, styles.sampleCard]} onPress={() => setSelected(item)}>
              <View style={styles.rowBetween}>
              <Text style={styles.row1}>{`${item.symbol} - ${item.side === "long" ? "Long" : "Short"}`}</Text>
              <View style={styles.sampleTag}>
                <Text style={styles.sampleTagText}>Sample</Text>
              </View>
              </View>

              <View style={styles.rowBetween}>
                <View style={[styles.statusChip, { borderColor: "#94a3b8" }]}>
                  <Text style={[styles.statusChipText, { color: "#64748b" }]}>{statusLabel(item.status)}</Text>
                </View>
              </View>

              <Text style={[styles.row2, isPnl ? { color: (item.pnl_total ?? 0) >= 0 ? "#166534" : "#b91c1c" } : null]}>{summary}</Text>
              <View style={styles.rowBetween}>
                <Text style={styles.row3}>{formatDateCompact(item.created_at)}</Text>
                <Text style={styles.row3}>{`Risk ${typeof item.risk_used_usd === "number" ? usd(item.risk_used_usd) : "-"}`}</Text>
              </View>
            </Pressable>
          );
        })}
        {visibleSamples.length === 0 ? <Text style={styles.sampleEmpty}>No sample cards for this filter.</Text> : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.filtersWrap}>
        <FlatList
          horizontal
          data={statusFilters}
          keyExtractor={(f) => f.key}
          contentContainerStyle={styles.chipRow}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.filterChip, status === item.key && styles.filterChipActive]}
              onPress={() => setStatus(item.key)}
            >
              <Text style={[styles.filterChipText, status === item.key && styles.filterChipTextActive]}>{item.label}</Text>
            </Pressable>
          )}
        />
        <View style={styles.rangeRow}>
          {rangeFilters.map((item) => (
            <Pressable
              key={item.key}
              style={[styles.rangeChip, range === item.key && styles.rangeChipActive]}
              onPress={() => setRange(item.key)}
            >
              <Text style={[styles.rangeChipText, range === item.key && styles.rangeChipTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.updatedText}>{lastUpdated ? `Last updated ${dateTime(lastUpdated)}` : "Last updated -"}</Text>
      </View>

      {error ? <ErrorState message={error} onRetry={() => void loadActivity({ append: false, cursor: null })} /> : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={!loading ? <Text style={styles.emptyText}>{emptyText}</Text> : null}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          void onEndReached();
        }}
        ListFooterComponent={
          <View>
            {loadingMore ? <Text style={styles.loadingMore}>Loading more...</Text> : null}
            {renderSamplePreview()}
          </View>
        }
      />

      <Modal transparent visible={selected != null} animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            {selected ? (
              <>
                <View style={styles.rowBetween}>
                  <Text style={styles.sheetTitle}>{`${selected.symbol} • ${selected.side === "long" ? "Long" : "Short"}`}</Text>
                  <Pressable onPress={() => setSelected(null)}><Text style={styles.close}>Close</Text></Pressable>
                </View>

                <View style={styles.sheetBlock}>
                  <Text style={styles.blockTitle}>Trade Plan</Text>
                  <Text style={styles.blockText}>{`Entry: ${selected.entry_price != null ? usd(selected.entry_price) : "-"}`}</Text>
                  <Text style={styles.blockText}>{`Stop: ${selected.stop_loss_price != null ? usd(selected.stop_loss_price) : "-"}`}</Text>
                  <Text style={styles.blockText}>{`Take Profit: ${selected.take_profit_price != null ? usd(selected.take_profit_price) : "-"}`}</Text>
                </View>

                <View style={styles.sheetBlock}>
                  <Text style={styles.blockTitle}>Outcome</Text>
                  <Text style={styles.blockText}>{`Status: ${statusLabel(selected.status)}`}</Text>
                  <Text style={styles.blockText}>{`Filled Avg: ${selected.filled_avg_price != null ? usd(selected.filled_avg_price) : "-"}`}</Text>
                  <Text style={styles.blockText}>{`P/L: ${typeof selected.pnl_total === "number" ? usd(selected.pnl_total) : "-"}`}</Text>
                  <Text style={styles.blockText}>{`Order: ${selected.order_status ?? "-"}`}</Text>
                </View>

                <View style={styles.sheetBlock}>
                  <Text style={styles.blockTitle}>Reason</Text>
                  <Text style={styles.blockText}>{selected.reason ?? "-"}</Text>
                </View>

                <View style={styles.sheetBlock}>
                  <Text style={styles.blockTitle}>Approval Mode</Text>
                  <Text style={styles.blockText}>
                    {selected.status === "shadow" ? "N/A (Debug shadow)" : selected.approved_mode === "auto" ? "Auto" : "Manual"}
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  filtersWrap: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: "#f8fafc",
  },
  chipRow: { paddingBottom: 8, gap: 8 },
  filterChip: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  filterChipActive: { backgroundColor: "#0f172a", borderColor: "#0f172a" },
  filterChipText: { color: "#334155", fontWeight: "600", fontSize: 12 },
  filterChipTextActive: { color: "white" },
  rangeRow: { flexDirection: "row", gap: 8, paddingBottom: 6 },
  rangeChip: {
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  rangeChipActive: { backgroundColor: "#e2e8f0" },
  rangeChipText: { color: "#475569", fontWeight: "600", fontSize: 12 },
  rangeChipTextActive: { color: "#0f172a" },
  updatedText: { color: "#64748b", fontSize: 11 },
  listContent: { padding: 12, gap: 10, paddingBottom: 28 },
  card: {
    borderRadius: 18,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    gap: 8,
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  row1: { color: "#0f172a", fontSize: 16, fontWeight: "700" },
  row2: { color: "#334155", fontSize: 14, fontWeight: "600" },
  row3: { color: "#64748b", fontSize: 12 },
  statusChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusChipText: { fontSize: 11, fontWeight: "700" },
  emptyText: { textAlign: "center", color: "#64748b", marginTop: 28, fontSize: 14 },
  loadingMore: { textAlign: "center", color: "#64748b", paddingVertical: 8 },
  sampleSection: { paddingTop: 6, gap: 8 },
  sampleSectionTitle: { color: "#64748b", fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  sampleEmpty: { color: "#94a3b8", fontSize: 12 },
  sampleCard: { backgroundColor: "#f1f5f9", borderColor: "#cbd5e1" },
  sampleTag: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#94a3b8",
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#e2e8f0",
  },
  sampleTagText: { color: "#475569", fontSize: 11, fontWeight: "700" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 16,
    gap: 10,
    maxHeight: "80%",
  },
  sheetTitle: { color: "#0f172a", fontSize: 18, fontWeight: "700" },
  close: { color: "#334155", fontWeight: "600" },
  sheetBlock: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 10,
    gap: 2,
  },
  blockTitle: { color: "#0f172a", fontWeight: "700", marginBottom: 2 },
  blockText: { color: "#334155", fontSize: 13 },
});
