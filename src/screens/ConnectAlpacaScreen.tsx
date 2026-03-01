import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";

import { track } from "@/analytics/track";
import { toApiError } from "@/api/client";
import { BrokerStatusResponse, finishAlpacaOAuth, getBrokerStatus, startAlpacaOAuth } from "@/api/broker";
import { acceptStocksAgreement } from "@/api/agreements";
import { ENABLE_LIVE_BROKER } from "@/config/env";
import { getStocksAgreementState, setStocksAgreementAccepted } from "@/storage/agreements";

type BrokerMode = "paper" | "live";

type Props = {
  navigation: { goBack: () => void };
  route?: { params?: { mode?: BrokerMode } };
};

WebBrowser.maybeCompleteAuthSession();

const initialStatus: BrokerStatusResponse = {
  alpaca: {
    paper: { connected: false, connectedAt: null, accountId: null, lastError: null },
    live: { connected: false, connectedAt: null, accountId: null, lastError: null },
  },
};

export default function ConnectAlpacaScreen({ navigation, route }: Props): React.JSX.Element {
  const presetMode = route?.params?.mode;
  const [mode, setMode] = useState<BrokerMode>(presetMode ?? "paper");
  const [status, setStatus] = useState<BrokerStatusResponse>(initialStatus);
  const [agreementAccepted, setAgreementAccepted] = useState<boolean>(false);
  const [agreementAcceptedAt, setAgreementAcceptedAt] = useState<string | null>(null);
  const [loadingAgreement, setLoadingAgreement] = useState<boolean>(true);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>("");

  useEffect(() => {
    Promise.all([getStocksAgreementState(), getBrokerStatus()])
      .then(([agreementState, brokerStatus]) => {
        setAgreementAccepted(agreementState.stocksAgreementAccepted);
        setAgreementAcceptedAt(agreementState.stocksAgreementAcceptedAt);
        setStatus(brokerStatus);
      })
      .finally(() => setLoadingAgreement(false));
  }, []);

  useEffect(() => {
    if (presetMode) setMode(presetMode);
  }, [presetMode]);

  const selectedMode = ENABLE_LIVE_BROKER ? mode : "paper";
  const isModeConnected = selectedMode === "live" ? status.alpaca.live.connected : status.alpaca.paper.connected;

  const modeNote = useMemo(() => {
    if (selectedMode === "live") {
      return "Live trading uses real money. You can pause anytime.";
    }
    return "Paper trading is recommended while validating the system.";
  }, [selectedMode]);

  const onAcceptAgreement = async () => {
    setErrorText("");
    if (agreementAccepted) {
      setAgreementAccepted(false);
      setAgreementAcceptedAt(null);
      return;
    }

    try {
      const acceptedAt = new Date().toISOString();
      await setStocksAgreementAccepted("v1", acceptedAt);
      await acceptStocksAgreement("v1", acceptedAt);
      setAgreementAccepted(true);
      setAgreementAcceptedAt(acceptedAt);
      track("broker_stocks_agreement_accepted", { version: "v1" });
    } catch (error) {
      setErrorText(toApiError(error));
    }
  };

  const onStartOAuth = async () => {
    if (!agreementAccepted) return;
    if (isModeConnected) {
      setErrorText(`Single ${selectedMode} account supported currently. Disconnect first to replace it.`);
      return;
    }

    setErrorText("");
    const redirectUri = makeRedirectUri({ scheme: "autodtrader", path: "broker/callback" });

    try {
      setConnecting(true);
      track("broker_connect_tapped", { broker: "alpaca", mode: selectedMode });

      const start = await startAlpacaOAuth(selectedMode, redirectUri);
      track("broker_oauth_started", { mode: selectedMode });

      const result = await WebBrowser.openAuthSessionAsync(start.authorizeUrl, redirectUri);
      if (result.type !== "success") {
        setErrorText("Connection canceled.");
        track("broker_oauth_failed", { reason: result.type });
        return;
      }

      const callbackUrl = result.url;
      if (!callbackUrl) {
        setErrorText("Authorization failed. Try again.");
        track("broker_oauth_failed", { reason: "missing_callback_url" });
        return;
      }

      const parsed = new URL(callbackUrl);
      const code = parsed.searchParams.get("code");
      const state = parsed.searchParams.get("state");
      const returnedError = parsed.searchParams.get("error");

      if (returnedError) {
        setErrorText("Authorization failed. Try again.");
        track("broker_oauth_failed", { reason: returnedError });
        return;
      }

      if (!code) {
        setErrorText("Authorization failed. Try again.");
        track("broker_oauth_failed", { reason: "missing_code" });
        return;
      }

      if (!state || state !== start.state) {
        setErrorText("Security check failed. Try again.");
        track("broker_oauth_failed", { reason: "invalid_state" });
        return;
      }

      await finishAlpacaOAuth(code, state, selectedMode);
      track("broker_oauth_completed", { mode: selectedMode });
      Alert.alert("Success", "Alpaca connected");
      navigation.goBack();
    } catch (error) {
      setErrorText(toApiError(error));
      track("broker_oauth_failed", { reason: "network_or_server" });
    } finally {
      setConnecting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect Alpaca</Text>
      <Text style={styles.subtitle}>Connect Alpaca to place stock trades securely. We never store your password.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Mode</Text>
        {ENABLE_LIVE_BROKER ? (
          <View style={styles.modeRow}>
            <Pressable style={[styles.modePill, mode === "paper" && styles.modePillActive]} onPress={() => setMode("paper")}>
              <Text style={[styles.modePillText, mode === "paper" && styles.modePillTextActive]}>Paper</Text>
            </Pressable>
            <Pressable style={[styles.modePill, mode === "live" && styles.modePillActive]} onPress={() => setMode("live")}>
              <Text style={[styles.modePillText, mode === "live" && styles.modePillTextActive]}>Live</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.paperOnlyPill}>
            <Text style={styles.paperOnlyText}>Paper (Recommended)</Text>
          </View>
        )}

        <Text style={styles.helper}>{modeNote}</Text>
        {isModeConnected ? <Text style={styles.lockedText}>Single {selectedMode} account supported currently.</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Stocks Trading Agreement (v1)</Text>
        <Text style={styles.agreementText}>
          Stocks can lose value quickly and losses can exceed expectations. You are responsible for your broker account activity and must use risk limits.
        </Text>
        <Text style={styles.agreementText}>
          This system does not guarantee profits. Use paper mode first and trade only with amounts you can afford to lose.
        </Text>

        <Pressable onPress={() => Alert.alert("Stocks Agreement", "This is a stocks-only risk disclosure. No crypto or options are enabled in this app.")}> 
          <Text style={styles.linkText}>Read full agreement</Text>
        </Pressable>

        {loadingAgreement ? (
          <ActivityIndicator size="small" color="#64748b" />
        ) : (
          <Pressable style={styles.checkboxRow} onPress={() => void onAcceptAgreement()}>
            <View style={[styles.checkbox, agreementAccepted && styles.checkboxChecked]}>{agreementAccepted ? <Text style={styles.check}>✓</Text> : null}</View>
            <View style={{ flex: 1 }}>
              <Text style={styles.checkboxLabel}>I agree</Text>
              {agreementAcceptedAt ? <Text style={styles.checkboxMeta}>{`Accepted at ${new Date(agreementAcceptedAt).toLocaleString()}`}</Text> : null}
            </View>
          </Pressable>
        )}
      </View>

      <Pressable
        accessibilityLabel="Continue to Alpaca"
        style={[styles.primaryButton, (!agreementAccepted || connecting || isModeConnected) && styles.disabled]}
        disabled={!agreementAccepted || connecting || isModeConnected}
        onPress={() => void onStartOAuth()}
      >
        <Text style={styles.primaryButtonText}>{connecting ? "Connecting..." : "Continue to Alpaca"}</Text>
      </Pressable>

      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "700", color: "#0f172a" },
  subtitle: { color: "#475569", fontSize: 14, lineHeight: 20 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "white",
    padding: 14,
    gap: 10,
  },
  label: { color: "#0f172a", fontSize: 15, fontWeight: "600" },
  modeRow: { flexDirection: "row", gap: 8 },
  modePill: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  modePillActive: { backgroundColor: "#0f172a", borderColor: "#0f172a" },
  modePillText: { color: "#334155", fontWeight: "600" },
  modePillTextActive: { color: "white" },
  paperOnlyPill: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#0f172a",
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  paperOnlyText: { color: "white", fontWeight: "600" },
  helper: { color: "#64748b", fontSize: 12 },
  lockedText: { color: "#64748b", fontSize: 12, fontWeight: "600" },
  agreementText: { color: "#334155", fontSize: 13, lineHeight: 19 },
  linkText: { color: "#0f172a", fontSize: 13, textDecorationLine: "underline" },
  checkboxRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: "#0f172a", borderColor: "#0f172a" },
  check: { color: "white", fontWeight: "700", fontSize: 12 },
  checkboxLabel: { color: "#0f172a", fontWeight: "600" },
  checkboxMeta: { color: "#64748b", fontSize: 11, marginTop: 2 },
  primaryButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryButtonText: { color: "white", fontWeight: "600", fontSize: 15 },
  disabled: { opacity: 0.5 },
  error: { color: "#b91c1c", fontSize: 13 },
});
