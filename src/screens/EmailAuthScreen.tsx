import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuth } from "@/auth/AuthContext";

type Props = {
  navigation: { navigate: (route: "ForgotPassword") => void; goBack: () => void };
};

type Mode = "signup" | "signin";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function EmailAuthScreen({ navigation }: Props): React.JSX.Element {
  const { signupEmail, loginEmail } = useAuth();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>("");
  const [infoText, setInfoText] = useState<string>("");

  const validationError = useMemo(() => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) return "Enter a valid email address.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (mode === "signup" && password !== confirmPassword) return "Passwords do not match.";
    return null;
  }, [confirmPassword, email, mode, password]);

  const onSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    setInfoText("");
    setErrorText("");
    if (validationError) {
      setErrorText(validationError);
      return;
    }

    try {
      setLoading(true);
      if (mode === "signup") {
        await signupEmail(normalizedEmail, password);
        setInfoText(`Verification email sent to ${normalizedEmail}.`);
      } else {
        await loginEmail(normalizedEmail, password);
      }
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Email Authentication</Text>

      <View style={styles.segment}>
        <Pressable
          accessibilityLabel="Sign up tab"
          style={[styles.segmentItem, mode === "signup" && styles.segmentItemActive]}
          onPress={() => setMode("signup")}
        >
          <Text style={[styles.segmentText, mode === "signup" && styles.segmentTextActive]}>Sign Up</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Sign in tab"
          style={[styles.segmentItem, mode === "signin" && styles.segmentItemActive]}
          onPress={() => setMode("signin")}
        >
          <Text style={[styles.segmentText, mode === "signin" && styles.segmentTextActive]}>Sign In</Text>
        </Pressable>
      </View>

      <TextInput
        accessibilityLabel="Email"
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        accessibilityLabel="Password"
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {mode === "signup" ? (
        <TextInput
          accessibilityLabel="Confirm password"
          style={styles.input}
          placeholder="Confirm Password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
      ) : null}

      <Pressable accessibilityLabel={mode === "signup" ? "Create account" : "Sign in"} style={styles.primaryButton} onPress={onSubmit} disabled={loading}>
        <Text style={styles.primaryText}>{loading ? "Please wait..." : mode === "signup" ? "Create Account" : "Sign In"}</Text>
      </Pressable>

      {mode === "signin" ? (
        <Pressable accessibilityLabel="Forgot password" style={styles.linkButton} onPress={() => navigation.navigate("ForgotPassword")}>
          <Text style={styles.linkText}>Forgot password?</Text>
        </Pressable>
      ) : null}

      <Pressable accessibilityLabel="Back" style={styles.secondaryButton} onPress={navigation.goBack}>
        <Text style={styles.secondaryText}>Back</Text>
      </Pressable>

      {infoText ? <Text style={styles.info}>{infoText}</Text> : null}
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
    marginBottom: 4,
  },
  segment: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    backgroundColor: "white",
    overflow: "hidden",
  },
  segmentItem: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentItemActive: {
    backgroundColor: "#0f172a",
  },
  segmentText: { color: "#334155", fontWeight: "600" },
  segmentTextActive: { color: "white" },
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
    marginTop: 4,
  },
  primaryText: {
    color: "white",
    fontWeight: "600",
    fontSize: 15,
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    color: "#0f172a",
    fontWeight: "600",
  },
  linkButton: { minHeight: 36, alignItems: "center", justifyContent: "center" },
  linkText: { color: "#0f172a", fontWeight: "500", textDecorationLine: "underline" },
  info: { color: "#0f766e", textAlign: "center", fontSize: 13 },
  error: { color: "#b91c1c", textAlign: "center", fontSize: 13 },
});
