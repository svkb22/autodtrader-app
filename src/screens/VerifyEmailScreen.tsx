import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/auth/AuthContext";

type Props = {
  navigation: { navigate: (route: "EmailAuth") => void };
};

const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyEmailScreen({ navigation }: Props): React.JSX.Element {
  const { firebaseUser, refreshVerificationStatus, resendVerification, signOut } = useAuth();
  const [cooldown, setCooldown] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>("");
  const [errorText, setErrorText] = useState<string>("");

  const email = useMemo(() => firebaseUser?.email ?? "your email", [firebaseUser?.email]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const check = async () => {
      setLoading(true);
      setErrorText("");
      try {
        await refreshVerificationStatus();
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : "Could not refresh verification status.");
      } finally {
        setLoading(false);
      }
    };
    void check();
  }, [refreshVerificationStatus]);

  const onResend = async () => {
    if (cooldown > 0) return;
    setErrorText("");
    setStatusText("");
    try {
      setLoading(true);
      await resendVerification();
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setStatusText("Verification email resent.");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Could not resend email.");
    } finally {
      setLoading(false);
    }
  };

  const onVerified = async () => {
    setErrorText("");
    setStatusText("");
    try {
      setLoading(true);
      const verified = await refreshVerificationStatus();
      if (!verified) {
        setStatusText("Email is still unverified. Please check your inbox.");
      }
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Could not verify status.");
    } finally {
      setLoading(false);
    }
  };

  const onChangeEmail = async () => {
    await signOut();
    navigation.navigate("EmailAuth");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.body}>{`We sent a verification link to ${email}.`}</Text>

      <Pressable accessibilityLabel="I verified my email" style={styles.primaryButton} onPress={onVerified} disabled={loading}>
        <Text style={styles.primaryText}>{loading ? "Checking..." : "I’ve verified"}</Text>
      </Pressable>

      <Pressable
        accessibilityLabel="Resend verification email"
        style={[styles.secondaryButton, cooldown > 0 && styles.disabled]}
        onPress={onResend}
        disabled={cooldown > 0 || loading}
      >
        <Text style={styles.secondaryText}>{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}</Text>
      </Pressable>

      <Pressable accessibilityLabel="Change email" style={styles.linkButton} onPress={onChangeEmail}>
        <Text style={styles.linkText}>Change email</Text>
      </Pressable>

      {statusText ? <Text style={styles.info}>{statusText}</Text> : null}
      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    padding: 20,
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "#0f172a",
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
    marginBottom: 8,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "white", fontWeight: "600" },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: "#0f172a", fontWeight: "600" },
  linkButton: { minHeight: 36, alignItems: "center", justifyContent: "center" },
  linkText: { color: "#0f172a", fontWeight: "500", textDecorationLine: "underline" },
  info: { color: "#0f766e", textAlign: "center", fontSize: 13 },
  error: { color: "#b91c1c", textAlign: "center", fontSize: 13 },
  disabled: { opacity: 0.6 },
});
