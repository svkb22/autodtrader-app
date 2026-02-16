import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { authMagicLink, toApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";

export default function LoginScreen(): JSX.Element {
  const { signIn } = useAuth();
  const [email, setEmail] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [sent, setSent] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const onSend = async () => {
    try {
      setLoading(true);
      await authMagicLink(email.trim());
      setSent(true);
      Alert.alert("Code sent", "Use your OTP code to continue.");
    } catch (error) {
      Alert.alert("Failed", toApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    try {
      setLoading(true);
      await signIn(email.trim(), code.trim());
    } catch (error) {
      Alert.alert("Login failed", toApiError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Auto Day-Trader</Text>
      <TextInput style={styles.input} placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <Pressable style={styles.primary} onPress={onSend} disabled={loading || !email.trim()}>
        <Text style={styles.primaryText}>Send Magic Link / OTP</Text>
      </Pressable>

      <TextInput style={styles.input} placeholder="Code" value={code} onChangeText={setCode} editable={sent} />
      <Pressable style={[styles.primary, !sent && styles.disabled]} onPress={onVerify} disabled={loading || !sent || !code.trim()}>
        <Text style={styles.primaryText}>Verify & Sign In</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12, justifyContent: "center", backgroundColor: "#f8fafc" },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 8, color: "#0f172a" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "white",
  },
  primary: {
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryText: { color: "white", fontWeight: "700" },
  disabled: { opacity: 0.5 },
});
