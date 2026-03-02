import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";

import { track } from "@/analytics/track";
import { toApiError } from "@/api/client";
import { BrokerStatusResponse, finishAlpacaOAuth, getBrokerStatus, startAlpacaOAuth } from "@/api/broker";
import { ENABLE_LIVE_BROKER } from "@/config/env";
import { useOnboarding } from "@/onboarding/OnboardingContext";
import OnboardingLayout from "@/screens/onboarding/OnboardingLayout";

type BrokerMode = "paper" | "live";

type Props = {
  navigation: { goBack: () => void; navigate: (route: "RiskGuardrails") => void };
};

WebBrowser.maybeCompleteAuthSession();

const initialStatus: BrokerStatusResponse = {
  alpaca: {
    paper: { connected: false, connectedAt: null, accountId: null, lastError: null },
    live: { connected: false, connectedAt: null, accountId: null, lastError: null },
  },
};

export default function ConnectBrokerOnboardingScreen({ navigation }: Props): React.JSX.Element {
  const { draft, setMode, setBrokerConnected } = useOnboarding();
  const [status, setStatus] = useState<BrokerStatusResponse>(initialStatus);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>("");
  const [helpOpen, setHelpOpen] = useState<boolean>(false);

  useEffect(() => {
    track("onboarding_step_viewed", { step: "connect_broker" });
    getBrokerStatus()
      .then((brokerStatus) => {
        setStatus(brokerStatus);
        if (brokerStatus.alpaca.live.connected) {
          setMode("live");
          setBrokerConnected(true);
          return;
        }
        if (brokerStatus.alpaca.paper.connected) {
          setMode("paper");
          setBrokerConnected(true);
          return;
        }
        setBrokerConnected(false);
      })
      .catch(() => {
        setBrokerConnected(false);
      });
  }, [setBrokerConnected, setMode]);

  const selectedMode: BrokerMode = ENABLE_LIVE_BROKER ? draft.mode : "paper";
  const isModeConnected = selectedMode === "live" ? status.alpaca.live.connected : status.alpaca.paper.connected;
  const canContinue = useMemo(() => draft.brokerConnected, [draft.brokerConnected]);

  const onConnect = async () => {
    setErrorText("");
    track("broker_connect_started", { mode: selectedMode });

    if (isModeConnected) {
      setBrokerConnected(true);
      return;
    }

    const redirectUri = makeRedirectUri({ scheme: "autodtrader", path: "broker/callback" });

    try {
      setLoading(true);
      const start = await startAlpacaOAuth(selectedMode, redirectUri);
      track("broker_oauth_started", { mode: selectedMode });

      const result = await WebBrowser.openAuthSessionAsync(start.authorizeUrl, redirectUri);
      if (result.type !== "success") {
        setBrokerConnected(false);
        setErrorText("Connection canceled.");
        track("broker_oauth_failed", { reason: result.type });
        return;
      }

      const callbackUrl = result.url;
      if (!callbackUrl) {
        setBrokerConnected(false);
        setErrorText("Authorization failed. Try again.");
        track("broker_oauth_failed", { reason: "missing_callback_url" });
        return;
      }

      const parsed = new URL(callbackUrl);
      const code = parsed.searchParams.get("code");
      const state = parsed.searchParams.get("state");
      const returnedError = parsed.searchParams.get("error");

      if (returnedError) {
        setBrokerConnected(false);
        setErrorText("Authorization failed. Try again.");
        track("broker_oauth_failed", { reason: returnedError });
        return;
      }

      if (!code) {
        setBrokerConnected(false);
        setErrorText("Authorization failed. Try again.");
        track("broker_oauth_failed", { reason: "missing_code" });
        return;
      }

      if (!state || state !== start.state) {
        setBrokerConnected(false);
        setErrorText("Security check failed. Try again.");
        track("broker_oauth_failed", { reason: "invalid_state" });
        return;
      }

      await finishAlpacaOAuth(code, state, selectedMode);
      const refreshed = await getBrokerStatus();
      setStatus(refreshed);
      setBrokerConnected(selectedMode === "live" ? refreshed.alpaca.live.connected : refreshed.alpaca.paper.connected);
      track("broker_connect_success", { mode: selectedMode });
      track("broker_oauth_completed", { mode: selectedMode });
    } catch (error) {
      setBrokerConnected(false);
      const message = toApiError(error);
      setErrorText(message);
      track("broker_connect_failed", { error_code: message.slice(0, 80) });
      track("broker_oauth_failed", { reason: "network_or_server" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout
      step={3}
      totalSteps={7}
      title="Connect your brokerage"
      subtitle="Connect Alpaca with OAuth. We never store your password."
      primaryLabel="Continue"
      onPrimary={() => {
        track("onboarding_step_completed", { step: "connect_broker" });
        navigation.navigate("RiskGuardrails");
      }}
      primaryDisabled={!canContinue}
      secondaryLabel="Back"
      onSecondary={navigation.goBack}
    >
      <View style={styles.card}>
        <Text style={styles.label}>Mode</Text>
        {ENABLE_LIVE_BROKER ? (
          <View style={styles.toggleRow}>
            <Pressable
              accessibilityLabel="Use Paper Trading"
              style={[styles.modeButton, draft.mode === "paper" && styles.modeButtonActive]}
              onPress={() => setMode("paper")}
            >
              <Text style={[styles.modeText, draft.mode === "paper" && styles.modeTextActive]}>Paper (Recommended)</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Use Live Trading"
              style={[styles.modeButton, draft.mode === "live" && styles.modeButtonActive]}
              onPress={() => setMode("live")}
            >
              <Text style={[styles.modeText, draft.mode === "live" && styles.modeTextActive]}>Live</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.modeButton, styles.modeButtonActive]}>
            <Text style={[styles.modeText, styles.modeTextActive]}>Paper (Recommended)</Text>
          </View>
        )}

        <Pressable accessibilityLabel="Connect Alpaca" style={styles.connectButton} onPress={() => void onConnect()} disabled={loading}>
          <Text style={styles.connectText}>
            {loading ? "Connecting..." : draft.brokerConnected ? "Connected" : "Continue to Alpaca"}
          </Text>
        </Pressable>

        <Text style={styles.helper}>OAuth sign-in opens Alpaca authorization in a secure browser session.</Text>
        {errorText ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{errorText}</Text>
            <Pressable accessibilityLabel="Need help" onPress={() => setHelpOpen(true)}>
              <Text style={styles.helpLink}>Need help?</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <Modal visible={helpOpen} transparent animationType="fade" onRequestClose={() => setHelpOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Connection help</Text>
            <Text style={styles.modalBody}>Confirm your Alpaca account can access the selected mode and retry OAuth.</Text>
            <Pressable accessibilityLabel="Close help" style={styles.modalButton} onPress={() => setHelpOpen(false)}>
              <Text style={styles.modalButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    gap: 10,
  },
  label: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "600",
  },
  toggleRow: {
    flexDirection: "row",
    gap: 8,
  },
  modeButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  modeButtonActive: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },
  modeText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "600",
  },
  modeTextActive: {
    color: "white",
  },
  connectButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  connectText: {
    color: "white",
    fontWeight: "600",
  },
  helper: {
    color: "#64748b",
    fontSize: 12,
  },
  errorWrap: {
    marginTop: 2,
    gap: 4,
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 13,
  },
  helpLink: {
    color: "#0f172a",
    fontSize: 13,
    textDecorationLine: "underline",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: "white",
    padding: 16,
    gap: 10,
  },
  modalTitle: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 16,
  },
  modalBody: {
    color: "#475569",
    fontSize: 14,
  },
  modalButton: {
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
  },
  modalButtonText: {
    color: "white",
    fontWeight: "600",
  },
});
