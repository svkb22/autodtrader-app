import React, { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { getCurrentProposal, getOrderOutcomes, getProposalsHistory, toApiError } from "@/api/client";
import { OrderOutcome, Proposal, ProposalHistoryItem } from "@/api/types";
import ErrorState from "@/components/ErrorState";
import { usd } from "@/utils/format";

type Nav = {
  navigate: (screen: "ProposalDetail", params: { proposalId: string }) => void;
};

type Section = { title: string; data: ProposalHistoryItem[] };

function toDayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (same(d, today)) return "Today";
  if (same(d, y)) return "Yesterday";
  return d.toLocaleDateString();
}

function statusBadge(status: string): string {
  if (status === "pending") return "Active";
  if (status === "executed" || status === "approved") return "Executed";
  if (status === "expired") return "Expired";
  if (status === "rejected") return "Rejected";
  if (status === "blocked") return "Blocked";
  return status;
}

function badgeColor(status: string): string {
  if (status === "executed" || status === "approved") return "#166534";
  if (status === "expired") return "#92400e";
  if (status === "rejected" || status === "blocked") return "#991b1b";
  return "#334155";
}

const sampleCards = [
  {
    id: "sample-1",
    title: "BUY AAPL",
    status: "Executed",
    strength: "Strong",
    line: "P/L +$24.80",
  },
  {
    id: "sample-2",
    title: "BUY NVDA",
    status: "Expired",
    strength: "Strong",
    line: "Expired - no action taken",
  },
] as const;

export default function HistoryScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const [activeProposal, setActiveProposal] = useState<Proposal | null>(null);
  const [items, setItems] = useState<ProposalHistoryItem[]>([]);
  const [outcomes, setOutcomes] = useState<Record<string, OrderOutcome>>({});
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [history, current, outcomesData] = await Promise.all([
        getProposalsHistory(80),
        getCurrentProposal(),
        getOrderOutcomes(),
      ]);
      setItems(history.items);
      setActiveProposal(current);
      setOutcomes(outcomesData);
    } catch (errorValue) {
      setError(toApiError(errorValue));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const activeId = activeProposal?.id ?? null;
  const timelineItems = useMemo(() => items.filter((i) => i.id !== activeId), [items, activeId]);

  const sections: Section[] = useMemo(() => {
    const map = new Map<string, ProposalHistoryItem[]>();
    for (const item of timelineItems) {
      const label = toDayLabel(item.created_at);
      const arr = map.get(label) ?? [];
      arr.push(item);
      map.set(label, arr);
    }
    return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
  }, [timelineItems]);

  const activeItem = useMemo(() => {
    if (!activeProposal) return null;
    return items.find((i) => i.id === activeProposal.id) ?? null;
  }, [items, activeProposal]);

  const renderRow = (item: ProposalHistoryItem) => {
    const outcome = outcomes[item.id];
    const pnl = outcome ? outcome.realized_pnl + outcome.unrealized_pnl : null;

    return (
      <Pressable key={item.id} style={styles.card} onPress={() => navigation.navigate("ProposalDetail", { proposalId: item.id })}>
        <Text style={styles.symbol}>{item.side.toUpperCase()} {item.symbol}</Text>
        <View style={styles.metaRow}>
          <Text style={[styles.badge, { color: badgeColor(item.status) }]}>{statusBadge(item.status)}</Text>
          <Text style={styles.strength}>{item.strength === "strong" ? "Strong" : item.strength === "medium" ? "Medium" : "Low"}</Text>
        </View>

        {item.status === "executed" || item.status === "approved" ? (
          <Text style={[styles.line, pnl == null ? null : { color: pnl >= 0 ? "#166534" : "#b91c1c" }]}>
            {pnl == null ? (item.order_summary?.filled_at ? "Filled" : "In progress") : `P/L ${usd(pnl)}`}
          </Text>
        ) : (
          <Text style={styles.reason}>{item.reason ?? "No additional details."}</Text>
        )}
      </Pressable>
    );
  };

  const renderSampleCards = () => (
    <View style={styles.samplesWrap}>
      <Text style={styles.samplesHeader}>Samples</Text>
      {sampleCards.map((sample) => (
        <View key={sample.id} style={[styles.card, styles.sampleCard]}>
          <View style={styles.sampleHeaderRow}>
            <Text style={styles.symbol}>{sample.title}</Text>
            <Text style={styles.sampleTag}>Sample</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.badge, { color: "#64748b" }]}>{sample.status}</Text>
            <Text style={styles.strength}>{sample.strength}</Text>
          </View>
          <Text style={styles.reason}>{sample.line}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {activeItem ? (
        <View style={styles.activeWrap}>
          <Text style={styles.sectionHeader}>Active</Text>
          {renderRow(activeItem)}
        </View>
      ) : null}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View>
            <Text style={styles.empty}>No activity yet.</Text>
            {renderSampleCards()}
          </View>
        }
        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
        renderItem={({ item }) => renderRow(item)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  list: { padding: 16, gap: 8 },
  empty: { textAlign: "center", marginTop: 24, color: "#64748b", marginBottom: 12 },
  activeWrap: { paddingHorizontal: 16, paddingTop: 12 },
  sectionHeader: { color: "#0f172a", fontWeight: "800", fontSize: 16, marginBottom: 6 },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    gap: 4,
    marginBottom: 8,
  },
  sampleCard: {
    backgroundColor: "#f1f5f9",
    borderColor: "#cbd5e1",
  },
  sampleHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sampleTag: {
    fontSize: 11,
    color: "#475569",
    borderWidth: 1,
    borderColor: "#94a3b8",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: "hidden",
  },
  samplesWrap: { marginTop: 4 },
  samplesHeader: { color: "#334155", fontWeight: "700", marginBottom: 6 },
  symbol: { fontSize: 18, fontWeight: "800", color: "#111827" },
  metaRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  badge: { fontWeight: "700" },
  strength: { color: "#475569", fontWeight: "600" },
  line: { color: "#334155" },
  reason: { color: "#64748b" },
});
