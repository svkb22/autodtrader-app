import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";

import { track } from "@/analytics/track";
import { BrokerStatusResponse, connectAlpacaManual, finishAlpacaOAuth, getBrokerStatus, startAlpacaOAuth } from "@/api/broker";
import { toApiError } from "@/api/client";
import OAuthResultBanner from "@/components/OAuthResultBanner";
import { ENABLE_LIVE_BROKER, ENABLE_MANUAL_ALPACA_CONNECT } from "@/config/env";
import { useOnboarding } from "@/onboarding/OnboardingContext";
import OnboardingLayout from "@/screens/onboarding/OnboardingLayout";
import { mapOAuthResultToUIState, OAuthAction, OAuthBannerState, parseOAuthErrorFromUrl } from "@/utils/mapOAuthError";
import { openExternalUrl } from "@/utils/openExternalUrl";

type BrokerMode = "paper" | "live";

type Props = {
  navigation: { goBack: () => void; navigate: (route: "RiskGuardrails") => void };
};

const ALPACA_SIGNUP_URL = "https://app.alpaca.markets/signup";

if (
  typeof window !== "undefined" &&
  window.location.pathname.includes("broker/callback")
) {
  WebBrowser.maybeCompleteAuthSession();
}

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
  const [oauthBanner, setOAuthBanner] = useState<OAuthBannerState | null>(null);
  const [manualOpen, setManualOpen] = useState<boolean>(false);
  const [manualKey, setManualKey] = useState<string>("");
  const [manualSecret, setManualSecret] = useState<string>("");
  const [manualMode, setManualMode] = useState<BrokerMode>("paper");
  const [manualLoading, setManualLoading] = useState<boolean>(false);
  const [manualError, setManualError] = useState<string>("");
  const [manualSuccess, setManualSuccess] = useState<string>("");

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

  const openSignup = async (source: string) => {
    track("alpaca_signup_link_clicked", { source, env: selectedMode });
    await openExternalUrl(ALPACA_SIGNUP_URL);
  };

  const applyOAuthMappedState = (input: { resultType?: string | null; error?: string | null; errorDescription?: string | null }) => {
    const mapped = mapOAuthResultToUIState(input);
    setOAuthBanner(mapped);
    track("alpaca_oauth_result", {
      env: selectedMode,
      resultType: mapped.category === "canceled" ? "cancel" : "error",
      mappedCategory: mapped.category,
      rawError: mapped.rawErrorCode,
    });
  };

  const onConnect = async () => {
    setOAuthBanner(null);
    track("alpaca_connect_clicked", { env: selectedMode });
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
        applyOAuthMappedState({ resultType: result.type });
        return;
      }

      const callbackUrl = result.url;
      const providerError = parseOAuthErrorFromUrl(callbackUrl);

      if (!callbackUrl) {
        setBrokerConnected(false);
        applyOAuthMappedState({ error: "invalid_request", errorDescription: "missing_callback_url" });
        return;
      }

      if (providerError.error) {
        setBrokerConnected(false);
        applyOAuthMappedState({ error: providerError.error, errorDescription: providerError.errorDescription });
        return;
      }

      const parsed = new URL(callbackUrl);
      const code = parsed.searchParams.get("code");
      const state = parsed.searchParams.get("state");

      if (!code) {
        setBrokerConnected(false);
        applyOAuthMappedState({ error: "invalid_request", errorDescription: "missing_code" });
        return;
      }

      if (!state || state !== start.state) {
        setBrokerConnected(false);
        applyOAuthMappedState({ error: "invalid_request", errorDescription: "invalid_state" });
        return;
      }

      await finishAlpacaOAuth(code, state, selectedMode);
      const refreshed = await getBrokerStatus(true);
      setStatus(refreshed);
      setBrokerConnected(selectedMode === "live" ? refreshed.alpaca.live.connected : refreshed.alpaca.paper.connected);
      setOAuthBanner(null);
      track("alpaca_oauth_result", { env: selectedMode, resultType: "success", mappedCategory: "success", rawError: null });
      track("broker_connect_success", { mode: selectedMode });
      track("broker_oauth_completed", { mode: selectedMode });
    } catch {
      setBrokerConnected(false);
      applyOAuthMappedState({ resultType: "error", error: "network_error", errorDescription: "network_or_server" });
      track("broker_oauth_failed", { reason: "network_or_server" });
    } finally {
      setLoading(false);
    }
  };

  const onBannerAction = async (action: OAuthAction) => {
    if (action === "retry") {
      track("alpaca_oauth_retry_clicked", { env: selectedMode });
      await onConnect();
      return;
    }
    if (action === "signup") {
      await openSignup("onboarding_banner");
      return;
    }
    navigation.goBack();
  };

  const onManualConnect = async () => {
    if (!manualKey.trim() || !manualSecret.trim()) {
      setManualError("Enter both API key and API secret.");
      return;
    }

    setManualLoading(true);
    setManualError("");
    setManualSuccess("");

    try {
      await connectAlpacaManual({
        env: manualMode,
        api_key: manualKey.trim(),
        api_secret: manualSecret.trim(),
      });
      const refreshed = await getBrokerStatus(true);
      setStatus(refreshed);
      const connected = manualMode === "live" ? refreshed.alpaca.live.connected : refreshed.alpaca.paper.connected;
      setBrokerConnected(connected);
      if (!connected) {
        setManualError("Connect call succeeded, but broker status is still disconnected. Please retry.");
        return;
      }

      setMode(manualMode);
      setManualKey("");
      setManualSecret("");
      setManualOpen(false);
      setManualSuccess("Broker connected.");
      setOAuthBanner(null);
    } catch (error) {
      setBrokerConnected(false);
      setManualError(toApiError(error) || "Manual connect failed. Please try again.");
    } finally {
      setManualLoading(false);
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
          <Text style={styles.connectText}>{loading ? "Connecting..." : draft.brokerConnected ? "Connected" : "Continue to Alpaca"}</Text>
        </Pressable>

        {ENABLE_MANUAL_ALPACA_CONNECT ? (
          <View style={styles.manualBlock}>
            <Pressable
              accessibilityLabel="Toggle manual connect"
              onPress={() => {
                setManualOpen((prev) => !prev);
                setManualError("");
                setManualSuccess("");
              }}
            >
              <Text style={styles.manualToggle}>
                Having trouble with OAuth? Connect manually (temporary)
              </Text>
            </Pressable>

            {manualOpen ? (
              <View style={styles.manualPanel}>
                {ENABLE_LIVE_BROKER ? (
                  <View style={styles.toggleRow}>
                    <Pressable
                      accessibilityLabel="Manual mode paper"
                      style={[styles.modeButton, manualMode === "paper" && styles.modeButtonActive]}
                      onPress={() => {
                        setManualMode("paper");
                        setManualError("");
                      }}
                    >
                      <Text style={[styles.modeText, manualMode === "paper" && styles.modeTextActive]}>Paper</Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel="Manual mode live"
                      style={[styles.modeButton, manualMode === "live" && styles.modeButtonActive]}
                      onPress={() => {
                        setManualMode("live");
                        setManualError("");
                      }}
                    >
                      <Text style={[styles.modeText, manualMode === "live" && styles.modeTextActive]}>Live</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.manualModeNote}>Mode: Paper</Text>
                )}

                <Text style={styles.label}>Alpaca API Key</Text>
                <TextInput
                  value={manualKey}
                  onChangeText={(next) => {
                    setManualKey(next);
                    setManualError("");
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                  placeholder="Enter API key"
                  placeholderTextColor="#94a3b8"
                />

                <Text style={styles.label}>Alpaca API Secret</Text>
                <TextInput
                  value={manualSecret}
                  onChangeText={(next) => {
                    setManualSecret(next);
                    setManualError("");
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  style={styles.input}
                  placeholder="Enter API secret"
                  placeholderTextColor="#94a3b8"
                />

                {manualError ? <Text style={styles.manualError}>{manualError}</Text> : null}

                <View style={styles.manualButtonsRow}>
                  <Pressable style={[styles.manualButton, styles.manualConnectButton, manualLoading && styles.manualButtonDisabled]} onPress={() => void onManualConnect()} disabled={manualLoading}>
                    <Text style={styles.manualConnectText}>{manualLoading ? "Connecting..." : "Connect"}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.manualButton, styles.manualCancelButton]}
                    onPress={() => {
                      setManualOpen(false);
                      setManualError("");
                    }}
                    disabled={manualLoading}
                  >
                    <Text style={styles.manualCancelText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {manualSuccess ? <Text style={styles.manualSuccess}>{manualSuccess}</Text> : null}

        <View style={styles.signupBlock}>
          <Text style={styles.signupTitle}>New to Alpaca?</Text>
          <Text style={styles.signupBody}>Create an account first, then return here to connect.</Text>
          <Pressable onPress={() => void openSignup("onboarding_connect")}> 
            <Text style={styles.signupLink}>Create Alpaca account</Text>
          </Pressable>
        </View>

        {oauthBanner ? (
          <OAuthResultBanner
            category={oauthBanner.category}
            title={oauthBanner.title}
            message={oauthBanner.message}
            primaryLabel={oauthBanner.primaryLabel}
            secondaryLabel={oauthBanner.secondaryLabel}
            onPrimary={() => void onBannerAction(oauthBanner.primaryAction)}
            onSecondary={() => void onBannerAction(oauthBanner.secondaryAction)}
          />
        ) : (
          <Text style={styles.helper}>OAuth sign-in opens Alpaca authorization in a secure browser session.</Text>
        )}
      </View>
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
  signupBlock: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    padding: 10,
    gap: 4,
  },
  signupTitle: { color: "#0f172a", fontSize: 14, fontWeight: "700" },
  signupBody: { color: "#64748b", fontSize: 12, lineHeight: 17 },
  signupLink: { color: "#0f172a", fontSize: 13, fontWeight: "600", textDecorationLine: "underline" },
  manualBlock: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    padding: 10,
    gap: 8,
  },
  manualToggle: {
    color: "#1e293b",
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  manualPanel: {
    gap: 8,
  },
  manualModeNote: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "600",
  },
  input: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 12,
    backgroundColor: "white",
    color: "#0f172a",
  },
  manualButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  manualButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  manualConnectButton: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },
  manualCancelButton: {
    backgroundColor: "white",
    borderColor: "#cbd5e1",
  },
  manualConnectText: {
    color: "white",
    fontWeight: "700",
  },
  manualCancelText: {
    color: "#334155",
    fontWeight: "700",
  },
  manualButtonDisabled: {
    opacity: 0.7,
  },
  manualError: {
    color: "#b91c1c",
    fontSize: 12,
    fontWeight: "600",
  },
  manualSuccess: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "700",
  },
});
