import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuth } from "@/auth/AuthContext";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type Props = {
  navigation: { goBack: () => void };
};

export default function ForgotPasswordScreen({ navigation }: Props): React.JSX.Element {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>("");
  const [errorText, setErrorText] = useState<string>("");

  const onSend = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    setStatusText("");
    setErrorText("");
    if (!isValidEmail(normalizedEmail)) {
      setErrorText("Enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      await sendPasswordReset(normalizedEmail);
      setStatusText("Check your inbox for the reset link.");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Could not send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.subtitle}>Enter your email and we’ll send a reset link.</Text>
      <TextInput
        accessibilityLabel="Reset password email"
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <Pressable accessibilityLabel="Send reset email" style={styles.primaryButton} onPress={onSend} disabled={loading}>
        <Text style={styles.primaryText}>{loading ? "Sending..." : "Send Reset Email"}</Text>
      </Pressable>

      <Pressable accessibilityLabel="Back" style={styles.secondaryButton} onPress={navigation.goBack}>
        <Text style={styles.secondaryText}>Back</Text>
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
  subtitle: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 8,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    backgroundColor: "white",
    paddingHorizontal: 12,
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
  info: { color: "#0f766e", textAlign: "center", fontSize: 13 },
  error: { color: "#b91c1c", textAlign: "center", fontSize: 13 },
});
