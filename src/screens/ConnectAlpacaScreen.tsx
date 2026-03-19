import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";

import { track } from "@/analytics/track";
import { toApiError } from "@/api/client";
import { BrokerStatusResponse, finishAlpacaOAuth, getBrokerStatus, startAlpacaOAuth } from "@/api/broker";
import { acceptStocksAgreement } from "@/api/agreements";
import BrandBackdrop from "@/components/BrandBackdrop";
import BrandLockup from "@/components/BrandLockup";
import OAuthResultBanner from "@/components/OAuthResultBanner";
import { ENABLE_LIVE_BROKER } from "@/config/env";
import { getStocksAgreementState, setStocksAgreementAccepted } from "@/storage/agreements";
import { prudexTheme } from "@/theme/prudex";
import { mapOAuthResultToUIState, OAuthAction, OAuthBannerState, parseOAuthErrorFromUrl } from "@/utils/mapOAuthError";
import { openExternalUrl } from "@/utils/openExternalUrl";

type BrokerMode = "paper" | "live";

type Props = {
  navigation: { goBack: () => void };
  route?: { params?: { mode?: BrokerMode } };
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

export default function ConnectAlpacaScreen({ navigation, route }: Props): React.JSX.Element {
  const presetMode = route?.params?.mode;
  const [mode, setMode] = useState<BrokerMode>(presetMode ?? "paper");
  const [status, setStatus] = useState<BrokerStatusResponse>(initialStatus);
  const [agreementAccepted, setAgreementAccepted] = useState<boolean>(false);
  const [agreementAcceptedAt, setAgreementAcceptedAt] = useState<string | null>(null);
  const [loadingAgreement, setLoadingAgreement] = useState<boolean>(true);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>("");
  const [oauthBanner, setOAuthBanner] = useState<OAuthBannerState | null>(null);

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
    setOAuthBanner(null);
    const redirectUri = makeRedirectUri({ scheme: "autodtrader", path: "broker/callback" });

    try {
      setConnecting(true);
      track("alpaca_connect_clicked", { env: selectedMode });
      track("broker_connect_tapped", { broker: "alpaca", mode: selectedMode });

      const start = await startAlpacaOAuth(selectedMode, redirectUri);
      track("broker_oauth_started", { mode: selectedMode });

      const result = await WebBrowser.openAuthSessionAsync(start.authorizeUrl, redirectUri);
      if (result.type !== "success") {
        applyOAuthMappedState({ resultType: result.type });
        return;
      }

      const callbackUrl = result.url;
      const providerError = parseOAuthErrorFromUrl(callbackUrl);

      if (!callbackUrl) {
        applyOAuthMappedState({ error: "invalid_request", errorDescription: "missing_callback_url" });
        return;
      }

      if (providerError.error) {
        applyOAuthMappedState({ error: providerError.error, errorDescription: providerError.errorDescription });
        return;
      }

      const parsed = new URL(callbackUrl);
      const code = parsed.searchParams.get("code");
      const state = parsed.searchParams.get("state");

      if (!code) {
        applyOAuthMappedState({ error: "invalid_request", errorDescription: "missing_code" });
        return;
      }

      if (!state || state !== start.state) {
        applyOAuthMappedState({ error: "invalid_request", errorDescription: "invalid_state" });
        return;
      }

      await finishAlpacaOAuth(code, state, selectedMode);
      setOAuthBanner(null);
      track("alpaca_oauth_result", { env: selectedMode, resultType: "success", mappedCategory: "success", rawError: null });
      track("broker_oauth_completed", { mode: selectedMode });
      Alert.alert("Success", "Alpaca connected");
      navigation.goBack();
    } catch {
      applyOAuthMappedState({ resultType: "error", error: "network_error", errorDescription: "network_or_server" });
      track("broker_oauth_failed", { reason: "network_or_server" });
    } finally {
      setConnecting(false);
    }
  };

  const onBannerAction = async (action: OAuthAction) => {
    if (action === "retry") {
      track("alpaca_oauth_retry_clicked", { env: selectedMode });
      await onStartOAuth();
      return;
    }
    if (action === "signup") {
      await openSignup("connect_screen_banner");
      return;
    }
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <BrandBackdrop />
      <BrandLockup variant="header" />
      <Text style={styles.title}>Connect Alpaca</Text>
      <Text style={styles.subtitle}>Connect the execution venue securely. Credentials are never stored.</Text>

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
      ) : null}

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
        <Text style={styles.label}>Stocks Agreement (v1)</Text>
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
          <ActivityIndicator size="small" color={prudexTheme.colors.textSubtle} />
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

      <View style={styles.signupBlock}>
        <Text style={styles.signupTitle}>New to Alpaca?</Text>
        <Text style={styles.signupBody}>Create an account first, then return here to connect.</Text>
        <Pressable onPress={() => void openSignup("connect_screen")}>
          <Text style={styles.signupLink}>Create Alpaca account</Text>
        </Pressable>
      </View>

      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: prudexTheme.colors.bg, padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "700", color: prudexTheme.colors.text },
  subtitle: { color: prudexTheme.colors.textMuted, fontSize: 14, lineHeight: 20 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: prudexTheme.colors.border,
    backgroundColor: prudexTheme.colors.surface,
    padding: 14,
    gap: 10,
  },
  label: { color: prudexTheme.colors.text, fontSize: 15, fontWeight: "600" },
  modeRow: { flexDirection: "row", gap: 8 },
  modePill: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: prudexTheme.colors.borderStrong,
    backgroundColor: prudexTheme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  modePillActive: { backgroundColor: prudexTheme.colors.primary, borderColor: prudexTheme.colors.primary },
  modePillText: { color: prudexTheme.colors.textMuted, fontWeight: "600" },
  modePillTextActive: { color: prudexTheme.colors.white },
  paperOnlyPill: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: prudexTheme.colors.primary,
    backgroundColor: prudexTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  paperOnlyText: { color: prudexTheme.colors.white, fontWeight: "600" },
  helper: { color: prudexTheme.colors.textSubtle, fontSize: 12 },
  lockedText: { color: prudexTheme.colors.textSubtle, fontSize: 12, fontWeight: "600" },
  agreementText: { color: prudexTheme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  linkText: { color: prudexTheme.colors.primarySoft, fontSize: 13, textDecorationLine: "underline" },
  checkboxRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: prudexTheme.colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: prudexTheme.colors.primary, borderColor: prudexTheme.colors.primary },
  check: { color: prudexTheme.colors.white, fontWeight: "700", fontSize: 12 },
  checkboxLabel: { color: prudexTheme.colors.text, fontWeight: "600" },
  checkboxMeta: { color: prudexTheme.colors.textSubtle, fontSize: 11, marginTop: 2 },
  primaryButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: prudexTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryButtonText: { color: prudexTheme.colors.white, fontWeight: "600", fontSize: 15 },
  disabled: { opacity: 0.5 },
  signupBlock: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: prudexTheme.colors.border,
    backgroundColor: prudexTheme.colors.surface,
    padding: 12,
    gap: 4,
  },
  signupTitle: { color: prudexTheme.colors.text, fontSize: 14, fontWeight: "700" },
  signupBody: { color: prudexTheme.colors.textSubtle, fontSize: 12, lineHeight: 17 },
  signupLink: { color: prudexTheme.colors.primarySoft, fontSize: 13, fontWeight: "600", textDecorationLine: "underline" },
  error: { color: prudexTheme.colors.negative, fontSize: 13 },
});
