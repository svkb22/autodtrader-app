import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { NavigationProp, ParamListBase, useFocusEffect, useNavigation } from "@react-navigation/native";

import { BrokerStatusResponse, getBrokerStatus } from "@/api/broker";
import { getBrokerAccount, toApiError } from "@/api/client";
import { BrokerAccount } from "@/api/types";
import AlpacaLogoBadge from "@/components/AlpacaLogoBadge";
import { ENABLE_LIVE_BROKER } from "@/config/env";

type Props = {
  navigation: { navigate: (route: "ConnectAlpaca") => void };
};

const initialStatus: BrokerStatusResponse = {
  alpaca: {
    paper: { connected: false, connectedAt: null, accountId: null, lastError: null },
    live: { connected: false, connectedAt: null, accountId: null, lastError: null },
  },
};

export default function BrokerDetailScreen({ navigation }: Props): React.JSX.Element {
  const rootNavigation = useNavigation<NavigationProp<ParamListBase>>();
  const [status, setStatus] = useState<BrokerStatusResponse>(initialStatus);
  const [account, setAccount] = useState<BrokerAccount | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>("");

  const loadStatus = useCallback(async () => {
    setErrorText("");
    try {
      const [next, nextAccount] = await Promise.all([getBrokerStatus(), getBrokerAccount()]);
      setStatus(next);
      setAccount(nextAccount);
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
  const connectedAccountId = status.alpaca.live.accountId ?? status.alpaca.paper.accountId ?? account?.id ?? null;

  const openRootRoute = (route: "RiskSettings" | "AutoExecuteSettings") => {
    rootNavigation.getParent()?.getParent()?.navigate(route);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.headerRow}>
        <AlpacaLogoBadge size={52} />
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Alpaca</Text>
          <Text style={styles.subtitle}>Stocks-only connection and controls.</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Connection</Text>
        {loading ? (
          <ActivityIndicator size="small" color="#64748b" />
        ) : (
          <View style={styles.statusWrap}>
            <Text style={styles.statusLine}>{paperConnected ? "Paper: Connected" : "Paper: Not connected"}</Text>
            {ENABLE_LIVE_BROKER ? <Text style={styles.statusLine}>{liveConnected ? "Live: Connected" : "Live: Not connected"}</Text> : null}
            {connectedAccountId ? <Text style={styles.statusLine}>Account ID: {truncateId(connectedAccountId)}</Text> : null}
            {account?.status ? <Text style={styles.statusLine}>Broker Status: {account.status}</Text> : null}
            {account ? (
              <View style={styles.accountMetaWrap}>
                <View style={styles.accountMetaRow}>
                  <Text style={styles.accountMetaLabel}>Equity</Text>
                  <Text style={styles.accountMetaValue}>{fmtUsd(account.equity)}</Text>
                </View>
                <View style={styles.accountMetaRow}>
                  <Text style={styles.accountMetaLabel}>Buying Power</Text>
                  <Text style={styles.accountMetaValue}>{fmtUsd(account.buying_power)}</Text>
                </View>
              </View>
            ) : null}
          </View>
        )}
        <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("ConnectAlpaca")}>
          <Text style={styles.primaryButtonText}>{paperConnected || liveConnected ? "Manage Connection" : "Connect Alpaca"}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Trading Settings</Text>
        <Pressable style={styles.rowButton} onPress={() => openRootRoute("RiskSettings")}>
          <Text style={styles.rowText}>Risk Settings</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <Pressable style={styles.rowButton} onPress={() => openRootRoute("AutoExecuteSettings")}>
          <Text style={styles.rowText}>Auto Execution</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>

      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
    </ScrollView>
  );
}

function truncateId(value: string): string {
  if (!value) return value;
  return value.length > 12 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}

function fmtUsd(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16, gap: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 24, fontWeight: "700", color: "#0f172a" },
  subtitle: { color: "#475569", fontSize: 14 },
  card: {
    borderRadius: 14,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    gap: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  statusWrap: { gap: 4 },
  statusLine: { color: "#334155", fontSize: 14 },
  accountMetaWrap: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    padding: 10,
    gap: 6,
  },
  accountMetaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  accountMetaLabel: { color: "#64748b", fontSize: 13 },
  accountMetaValue: { color: "#0f172a", fontSize: 13, fontWeight: "600" },
  primaryButton: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  primaryButtonText: { color: "white", fontWeight: "600" },
  rowButton: {
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowText: { color: "#0f172a", fontWeight: "600" },
  chevron: { color: "#64748b", fontSize: 20, lineHeight: 20 },
  error: { color: "#b91c1c", fontSize: 13 },
});
