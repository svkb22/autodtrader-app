import React, { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { getRecentOrders, toApiError } from "@/api/client";
import { Order } from "@/api/types";
import ErrorState from "@/components/ErrorState";
import { dateTime, usd } from "@/utils/format";

export default function HistoryScreen(): JSX.Element {
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const data = await getRecentOrders();
      setOrders(data);
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

  return (
    <View style={styles.container}>
      {error ? <ErrorState message={error} onRetry={load} /> : null}
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No orders yet</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.symbol} • {item.status}</Text>
            <Text style={styles.subtle}>Submitted: {dateTime(item.submitted_at)}</Text>
            <Text style={styles.subtle}>Avg Fill: {item.avg_fill_price == null ? "-" : usd(item.avg_fill_price)}</Text>
            <Text style={styles.subtle}>TP: {usd(item.take_profit_price)} | SL: {usd(item.stop_loss_price)}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  list: { padding: 16, gap: 10 },
  empty: { textAlign: "center", marginTop: 24, color: "#64748b" },
  card: { backgroundColor: "white", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 12, gap: 4 },
  title: { fontWeight: "700", color: "#0f172a" },
  subtle: { color: "#475569" },
});
