import React, { useCallback, useLayoutEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { getCurrentProposal, getRecentOrders, toApiError } from "@/api/client";
import { Order, Proposal } from "@/api/types";
import Countdown from "@/components/Countdown";
import ErrorState from "@/components/ErrorState";
import ProposalCard from "@/components/ProposalCard";
import { dateTime } from "@/utils/format";

type Nav = {
  navigate: (screen: "ConnectBroker" | "RiskSettings" | "Proposal", params?: { proposalId?: string }) => void;
  setOptions: (options: { headerRight?: () => JSX.Element }) => void;
};

export default function HomeScreen(): JSX.Element {
  const navigation = useNavigation<Nav>();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [currentProposal, recentOrders] = await Promise.all([getCurrentProposal(), getRecentOrders()]);
      setProposal(currentProposal);
      setOrders(recentOrders.slice(0, 3));
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

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerButtons}>
          <Pressable style={styles.headerBtn} onPress={() => navigation.navigate("ConnectBroker")}>
            <Text style={styles.headerBtnText}>Broker</Text>
          </Pressable>
          <Pressable style={styles.headerBtn} onPress={() => navigation.navigate("RiskSettings")}>
            <Text style={styles.headerBtnText}>Risk</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
    >
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      <Text style={styles.sectionTitle}>Current Proposal</Text>
      {proposal ? (
        <View style={styles.block}>
          <ProposalCard proposal={proposal} />
          <Countdown expiresAtISO={proposal.expires_at} />
          <View style={styles.row}>
            <Pressable style={styles.primary} onPress={() => navigation.navigate("Proposal", { proposalId: proposal.id })}>
              <Text style={styles.primaryText}>Open Proposal</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No active proposal</Text>
          <Pressable style={styles.secondary} onPress={load}>
            <Text style={styles.secondaryText}>Refresh</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.sectionTitle}>Recent Orders</Text>
      {orders.length === 0 ? (
        <Text style={styles.subtle}>No recent orders</Text>
      ) : (
        orders.map((order) => (
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
  block: { gap: 12 },
  row: { flexDirection: "row", gap: 8 },
  primary: {
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  primaryText: { color: "white", fontWeight: "700" },
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
  headerButtons: { flexDirection: "row", gap: 8 },
  headerBtn: { backgroundColor: "#e2e8f0", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  headerBtnText: { color: "#0f172a", fontSize: 12, fontWeight: "700" },
});
