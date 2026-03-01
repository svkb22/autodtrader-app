import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { NavigationProp, ParamListBase, useFocusEffect, useNavigation } from "@react-navigation/native";

import { BrokerStatusResponse, getBrokerStatus } from "@/api/broker";
import { activateSystem, alpacaDisconnect, getBrokerAccount, toApiError } from "@/api/client";
import { BrokerAccount } from "@/api/types";
import AlpacaLogoBadge from "@/components/AlpacaLogoBadge";
import { ENABLE_LIVE_BROKER } from "@/config/env";
import { BrokerMode, getActiveBrokerMode, setActiveBrokerMode } from "@/storage/brokerMode";

type Props = {
  navigation: { navigate: (route: "ConnectAlpaca", params?: { mode?: BrokerMode }) => void };
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
  const [activeMode, setActiveMode] = useState<BrokerMode>("paper");
  const [account, setAccount] = useState<BrokerAccount | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [disconnecting, setDisconnecting] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>("");

  const loadStatus = useCallback(async () => {
    setErrorText("");
    try {
      const [next, nextAccount, mode] = await Promise.all([getBrokerStatus(), getBrokerAccount(), getActiveBrokerMode()]);
      setStatus(next);
      setAccount(nextAccount);
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
  const connectedAccountId = status.alpaca.live.accountId ?? status.alpaca.paper.accountId ?? account?.id ?? null;

  const openRootRoute = (route: "RiskSettings" | "AutoExecuteSettings") => {
    rootNavigation.getParent()?.getParent()?.navigate(route);
  };

  const switchMode = (nextMode: BrokerMode) => {
    if (activeMode === nextMode) return;
    Alert.alert(
      `Switch to ${nextMode === "live" ? "Live" : "Paper"}?`,
      "Switching mode changes the orders, positions, and history you see and execute.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Switch",
          onPress: async () => {
            try {
              await setActiveBrokerMode(nextMode);
              await activateSystem(nextMode, { source: "broker_mode_switch" });
              setActiveMode(nextMode);
            } catch (error) {
              setErrorText(toApiError(error));
            }
          },
        },
      ]
    );
  };

  const disconnectNow = async () => {
    try {
      setDisconnecting(true);
      setErrorText("");
      const modes: BrokerMode[] = [];
      if (paperConnected) modes.push("paper");
      if (liveConnected) modes.push("live");

      if (modes.length > 0) {
        for (const mode of modes) {
          await alpacaDisconnect(mode);
        }
      } else {
        await alpacaDisconnect();
      }

      await setActiveBrokerMode("paper");
      await loadStatus();
      Alert.alert("Disconnected", "Alpaca broker has been disconnected.");
    } catch (error) {
      setErrorText(toApiError(error));
    } finally {
      setDisconnecting(false);
    }
  };

  const onDisconnectPress = () => {
    Alert.alert("Disconnect Broker", "Remove this Alpaca connection from the app?", [
      { text: "Cancel", style: "cancel" },
      { text: "Disconnect", style: "destructive", onPress: () => void disconnectNow() },
    ]);
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
          <Text style={styles.subtitle}>One account per environment. Paper + Live supported.</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Active Mode</Text>
        <View style={styles.modeRow}>
          <Pressable style={[styles.modePill, activeMode === "paper" && styles.modePillActive]} onPress={() => switchMode("paper")}>
            <Text style={[styles.modeText, activeMode === "paper" && styles.modeTextActive]}>Paper</Text>
          </Pressable>
          {ENABLE_LIVE_BROKER ? (
            <Pressable style={[styles.modePill, activeMode === "live" && styles.modePillActive]} onPress={() => switchMode("live")}>
              <Text style={[styles.modeText, activeMode === "live" && styles.modeTextActive]}>Live</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Connection Slots</Text>
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

        <View style={styles.actionsWrap}>
          <Pressable
            style={[styles.rowButton, paperConnected && styles.rowButtonDisabled]}
            onPress={() => navigation.navigate("ConnectAlpaca", { mode: "paper" })}
            disabled={paperConnected}
          >
            <Text style={[styles.rowText, paperConnected && styles.rowTextDisabled]}>
              {paperConnected ? "Paper Connected (single account supported)" : "Connect Paper"}
            </Text>
            {!paperConnected ? <Text style={styles.chevron}>›</Text> : null}
          </Pressable>

          {ENABLE_LIVE_BROKER ? (
            <Pressable
              style={[styles.rowButton, liveConnected && styles.rowButtonDisabled]}
              onPress={() => navigation.navigate("ConnectAlpaca", { mode: "live" })}
              disabled={liveConnected}
            >
              <Text style={[styles.rowText, liveConnected && styles.rowTextDisabled]}>
                {liveConnected ? "Live Connected (single account supported)" : "Connect Live"}
              </Text>
              {!liveConnected ? <Text style={styles.chevron}>›</Text> : null}
            </Pressable>
          ) : null}

          {anyConnected ? (
            <Pressable style={[styles.rowButton, styles.rowButtonDanger, disconnecting && styles.disabled]} onPress={onDisconnectPress} disabled={disconnecting}>
              <Text style={styles.rowTextDanger}>{disconnecting ? "Disconnecting..." : "Disconnect Broker"}</Text>
              <Text style={styles.chevronDanger}>›</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Trading Settings</Text>
        <Pressable style={styles.rowButton} onPress={() => void loadStatus()}>
          <Text style={styles.rowText}>Validate Connection</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
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
  modeRow: { flexDirection: "row", gap: 8 },
  modePill: {
    flex: 1,
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  modePillActive: { backgroundColor: "#0f172a", borderColor: "#0f172a" },
  modeText: { color: "#334155", fontWeight: "600" },
  modeTextActive: { color: "white" },
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
  actionsWrap: { gap: 8, marginTop: 2 },
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
  rowButtonDisabled: {
    backgroundColor: "#f1f5f9",
    borderColor: "#e2e8f0",
  },
  rowButtonDanger: {
    borderColor: "#fecaca",
    backgroundColor: "#fff1f2",
  },
  rowText: { color: "#0f172a", fontWeight: "600" },
  rowTextDisabled: { color: "#64748b" },
  rowTextDanger: { color: "#b91c1c", fontWeight: "700" },
  chevron: { color: "#64748b", fontSize: 20, lineHeight: 20 },
  chevronDanger: { color: "#b91c1c", fontSize: 20, lineHeight: 20 },
  error: { color: "#b91c1c", fontSize: 13 },
  disabled: { opacity: 0.6 },
});
