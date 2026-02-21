import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { track } from "@/analytics/track";
import { alpacaConnectWithCredentials, getBrokerStatus, toApiError } from "@/api/client";
import { useOnboarding } from "@/onboarding/OnboardingContext";
import OnboardingLayout from "@/screens/onboarding/OnboardingLayout";

type Props = {
  navigation: { goBack: () => void; navigate: (route: "RiskGuardrails") => void };
};

export default function ConnectBrokerOnboardingScreen({ navigation }: Props): React.JSX.Element {
  const { draft, setMode, setBrokerConnected } = useOnboarding();
  const [username, setUsername] = useState<string>(process.env.EXPO_PUBLIC_ALPACA_USERNAME ?? "placeholder");
  const [password, setPassword] = useState<string>(process.env.EXPO_PUBLIC_ALPACA_PASSWORD ?? "placeholder");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>("");
  const [helpOpen, setHelpOpen] = useState<boolean>(false);

  useEffect(() => {
    track("onboarding_step_viewed", { step: "connect_broker" });
    getBrokerStatus()
      .then((status) => {
        if (!status.connected) return;
        if (status.mode) setMode(status.mode);
        setBrokerConnected(true);
      })
      .catch(() => {
        // Non-blocking.
      });
  }, [setBrokerConnected, setMode]);

  const canContinue = useMemo(() => draft.brokerConnected, [draft.brokerConnected]);

  const onConnect = async () => {
    setErrorText("");
    track("broker_connect_started", { mode: draft.mode });
    try {
      setLoading(true);
      await alpacaConnectWithCredentials(draft.mode, username.trim(), password.trim());
      setBrokerConnected(true);
      track("broker_connect_success", { mode: draft.mode });
    } catch (error) {
      setBrokerConnected(false);
      const message = toApiError(error);
      setErrorText("Couldn’t connect. Try again.");
      track("broker_connect_failed", { error_code: message.slice(0, 80) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout
      step={3}
      totalSteps={7}
      title="Connect your brokerage"
      subtitle="Connect Alpaca to place trades securely. We never store your password."
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

        <Text style={styles.label}>Alpaca username/email</Text>
        <TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" />
        <Text style={styles.label}>Alpaca password</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} autoCapitalize="none" secureTextEntry />

        <Pressable accessibilityLabel="Connect Alpaca" style={styles.connectButton} onPress={onConnect} disabled={loading}>
          <Text style={styles.connectText}>{loading ? "Connecting..." : draft.brokerConnected ? "Connected" : "Connect Alpaca"}</Text>
        </Pressable>

        <Text style={styles.helper}>Start with paper trading to validate the system.</Text>
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
            <Text style={styles.modalBody}>Check your Alpaca credentials and selected mode (paper/live), then retry.</Text>
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
  input: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 12,
    backgroundColor: "white",
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
