import React, { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { getBrokerAccount, getCurrentProposal, getOrderOutcomes, getRecentOrders, getRisk, toApiError } from "@/api/client";
import { BrokerAccount, Order, OrderOutcome, Proposal, RiskProfile } from "@/api/types";
import Countdown from "@/components/Countdown";
import ErrorState from "@/components/ErrorState";
import ProposalCard from "@/components/ProposalCard";
import { dateTime, usd } from "@/utils/format";

type Nav = {
  navigate: (
    screen: "Proposal",
    params?: { proposalId?: string }
  ) => void;
};

export default function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [risk, setRisk] = useState<RiskProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [brokerAccount, setBrokerAccount] = useState<BrokerAccount | null>(null);
  const [todayUnrealized, setTodayUnrealized] = useState<number>(0);
  const [todayRealized, setTodayRealized] = useState<number>(0);
  const [todayTrades, setTodayTrades] = useState<number>(0);
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
      const [currentProposal, recentOrders, account, outcomes, riskProfile] = await Promise.all([
        getCurrentProposal(),
        getRecentOrders(),
        getBrokerAccount(),
        getOrderOutcomes(),
        getRisk(),
      ]);
      setProposal(currentProposal);
      setOrders(recentOrders.slice(0, 3));
      setBrokerAccount(account);
      setRisk(riskProfile);

      let unrealized = 0;
      let realized = 0;
      let tradesToday = 0;
      for (const order of recentOrders) {
        if (!isSameDay(order.submitted_at)) continue;
        tradesToday += 1;
        const outcome: OrderOutcome | undefined = outcomes[order.id];
        if (!outcome) continue;
        unrealized += outcome.unrealized_pnl;
        realized += outcome.realized_pnl;
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
    >
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      <Text style={styles.sectionTitle}>System</Text>
      <View style={styles.capitalCard}>
        <Text style={styles.capitalLabel}>Status</Text>
        <Text style={[styles.statusValue, systemStatus === "Paused" ? styles.bad : styles.good]}>{systemStatus}</Text>
      </View>

      <Text style={styles.sectionTitle}>Broker Capital</Text>
      <View style={styles.capitalCard}>
        <Text style={styles.capitalLabel}>Available Capital</Text>
        <Text style={styles.capitalValue}>{brokerAccount ? usd(Number(brokerAccount.buying_power || 0)) : "Not connected"}</Text>
      </View>

      <Text style={styles.sectionTitle}>Today Summary</Text>
      <View style={styles.capitalCard}>
        <Text style={styles.capitalLabel}>Trades</Text>
        <Text style={styles.capitalValueSmall}>{todayTrades}/{risk?.max_trades_per_day ?? 0}</Text>
        <Text style={styles.capitalLabel}>Unrealized P/L</Text>
        <Text style={[styles.capitalValueSmall, { color: todayUnrealized > 0 ? "#166534" : todayUnrealized < 0 ? "#b91c1c" : "#0f172a" }]}>
          {usd(todayUnrealized)}
        </Text>
        <Text style={styles.capitalLabel}>Realized P/L</Text>
        <Text style={[styles.capitalValueSmall, { color: todayRealized > 0 ? "#166534" : todayRealized < 0 ? "#b91c1c" : "#0f172a" }]}>
          {usd(todayRealized)}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Current Proposal</Text>
      {proposal ? (
        <View style={styles.block}>
          <ProposalCard proposal={proposal} availableCapital={brokerAccount ? Number(brokerAccount.buying_power || 0) : null} onPress={() => navigation.navigate("Proposal", { proposalId: proposal.id })} />
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
  capitalCard: {
    backgroundColor: "white",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  capitalLabel: { color: "#64748b", fontSize: 12, fontWeight: "600" },
  statusValue: { fontSize: 20, fontWeight: "800" },
  good: { color: "#166534" },
  bad: { color: "#b91c1c" },
  capitalValue: { color: "#0f172a", fontSize: 22, fontWeight: "700" },
  capitalValueSmall: { color: "#0f172a", fontSize: 18, fontWeight: "700" },
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
