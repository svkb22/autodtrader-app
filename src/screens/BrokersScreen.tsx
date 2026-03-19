import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { BrokerStatusResponse, getBrokerStatus } from "@/api/broker";
import { toApiError } from "@/api/client";
import AlpacaLogoBadge from "@/components/AlpacaLogoBadge";
import { ENABLE_LIVE_BROKER } from "@/config/env";
import { BrokerMode, getActiveBrokerMode } from "@/storage/brokerMode";
import { prudexTheme, surfaceCard } from "@/theme/prudex";

type Props = {
  navigation: { navigate: (route: "BrokerDetail") => void };
};

const initialStatus: BrokerStatusResponse = {
  alpaca: {
    paper: { connected: false, connectedAt: null, accountId: null, lastError: null },
    live: { connected: false, connectedAt: null, accountId: null, lastError: null },
  },
};

export default function BrokersScreen({ navigation }: Props): React.JSX.Element {
  const [status, setStatus] = useState<BrokerStatusResponse>(initialStatus);
  const [activeMode, setActiveMode] = useState<BrokerMode>("paper");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>("");

  const loadStatus = useCallback(async () => {
    setErrorText("");
    try {
      const [next, mode] = await Promise.all([getBrokerStatus(), getActiveBrokerMode()]);
      setStatus(next);
      setActiveMode(mode);
    } catch (error) {
      setErrorText(toApiError(error));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      loadStatus().finally(() => {
        if (active) setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [loadStatus])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStatus();
    setRefreshing(false);
  };

  const paperConnected = status.alpaca.paper.connected;
  const liveConnected = ENABLE_LIVE_BROKER && status.alpaca.live.connected;
  const anyConnected = paperConnected || liveConnected;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Execution venues</Text>
          <Text style={styles.headerMeta}>Venue status and active routing mode.</Text>
        </View>
      </View>

      <Pressable style={styles.card} accessibilityLabel="Alpaca broker" onPress={() => navigation.navigate("BrokerDetail")}>
        <AlpacaLogoBadge size={44} />
        <View style={[styles.statusDot, anyConnected ? styles.dotGreen : styles.dotGray]} />
        <View style={styles.info}>
          <Text style={styles.name}>Alpaca</Text>
          {loading ? <ActivityIndicator size="small" color={prudexTheme.colors.textSubtle} /> : <Text style={styles.subtitle}>Active mode: {activeMode === "live" ? "Live" : "Paper"}</Text>}
          {!loading ? (
            <Text style={styles.slotLine}>
              Paper: {paperConnected ? "Connected" : "Connect"}
              {ENABLE_LIVE_BROKER ? ` • Live: ${liveConnected ? "Connected" : "Connect"}` : ""}
            </Text>
          ) : null}
          {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>Venue capacity</Text>
        <Text style={styles.noteText}>One paper account can be attached at a time.</Text>
        {ENABLE_LIVE_BROKER ? <Text style={styles.noteText}>One live account can be attached at a time.</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: prudexTheme.colors.bg },
  content: { padding: 16, gap: 14 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "700", color: prudexTheme.colors.text },
  headerMeta: { color: prudexTheme.colors.textSubtle, marginTop: 2 },
  card: {
    ...surfaceCard,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginTop: 2 },
  dotGreen: { backgroundColor: prudexTheme.colors.positive },
  dotGray: { backgroundColor: prudexTheme.colors.textSubtle },
  info: { flex: 1, gap: 4 },
  name: { fontSize: 20, fontWeight: "600", color: prudexTheme.colors.text },
  subtitle: { color: prudexTheme.colors.textMuted, fontSize: 14 },
  slotLine: { color: prudexTheme.colors.textSubtle, fontSize: 13 },
  error: { color: prudexTheme.colors.negative, fontSize: 12 },
  chevron: { color: prudexTheme.colors.textSubtle, fontSize: 22, lineHeight: 22 },
  noteCard: {
    ...surfaceCard,
    padding: 12,
    gap: 2,
  },
  noteTitle: { color: prudexTheme.colors.text, fontWeight: "700", fontSize: 13 },
  noteText: { color: prudexTheme.colors.textSubtle, fontSize: 12 },
});
