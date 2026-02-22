import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";

import { authMagicLink, toApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { firebaseAuth, firebaseConfigReady } from "@/auth/firebaseClient";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen(): React.JSX.Element {
  const { signInOtp, signInWithFirebase } = useAuth();
  const defaultEmail = process.env.EXPO_PUBLIC_DEFAULT_EMAIL ?? "sathvik.bhoopathi@gmail.com";
  const defaultOtp = process.env.EXPO_PUBLIC_DEFAULT_OTP ?? "123456";
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const googleConfigured =
    firebaseConfigReady && Boolean(googleIosClientId || googleAndroidClientId || googleWebClientId);
  const [email, setEmail] = useState<string>(defaultEmail);
  const [code, setCode] = useState<string>(defaultOtp);
  const [sent, setSent] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>("");
  const [errorText, setErrorText] = useState<string>("");
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const busy = loading || googleLoading;
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: googleIosClientId,
    androidClientId: googleAndroidClientId,
    webClientId: googleWebClientId,
    scopes: ["openid", "profile", "email"],
  });

  useEffect(() => {
    if (!response) return;
    if (response.type !== "success") {
      if (response.type !== "dismiss") {
        setErrorText("Google sign-in cancelled.");
      }
      return;
    }

    const completeGoogleSignIn = async () => {
      try {
        setGoogleLoading(true);
        setStatusText("Signing in with Google...");
        setErrorText("");
        const idToken = response.authentication?.idToken;
        const accessToken = response.authentication?.accessToken;
        if (!idToken && !accessToken) {
          throw new Error("Google did not return auth tokens. Check OAuth client IDs.");
        }
        if (!firebaseAuth) {
          throw new Error("Firebase config is missing. Add EXPO_PUBLIC_FIREBASE_* variables.");
        }
        const credential = GoogleAuthProvider.credential(idToken, accessToken);
        await signInWithCredential(firebaseAuth, credential);
        const firebaseIdToken = await firebaseAuth.currentUser?.getIdToken(true);
        if (!firebaseIdToken) {
          throw new Error("Firebase session did not return an ID token.");
        }
        await signInWithFirebase(firebaseIdToken);
        setStatusText("Signed in.");
      } catch (error) {
        const message = toApiError(error);
        setStatusText("");
        setErrorText(message);
        Alert.alert("Google sign-in failed", message);
      } finally {
        setGoogleLoading(false);
      }
    };

    void completeGoogleSignIn();
  }, [response, signInWithFirebase]);

  const onSend = async () => {
    const normalizedEmail = email.trim();
    setErrorText("");
    setStatusText("Sending OTP...");
    try {
      setLoading(true);
      await authMagicLink(normalizedEmail);
      setSent(true);
      setStatusText("Code sent. Enter OTP to continue.");
      Alert.alert("Code sent", "Use your OTP code to continue.");
    } catch (error) {
      const message = toApiError(error);
      setStatusText("");
      setErrorText(message);
      Alert.alert("Failed", message);
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    const normalizedEmail = email.trim();
    const normalizedCode = code.trim();
    setErrorText("");
    setStatusText("Verifying code...");
    try {
      setLoading(true);
      await signInOtp(normalizedEmail, normalizedCode);
      setStatusText("Signed in.");
    } catch (error) {
      const message = toApiError(error);
      setStatusText("");
      setErrorText(message);
      Alert.alert("Login failed", message);
    } finally {
      setLoading(false);
    }
  };

  const onQuickSignIn = async () => {
    setErrorText("");
    setStatusText("Quick sign-in...");
    try {
      setLoading(true);
      await authMagicLink(defaultEmail);
      await signInOtp(defaultEmail, defaultOtp);
      setStatusText("Signed in.");
    } catch (error) {
      const message = toApiError(error);
      setStatusText("");
      setErrorText(message);
      Alert.alert("Login failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Auto Day-Trader</Text>
      <Pressable
        style={[styles.googleButton, (!request || busy || !googleConfigured) && styles.disabled]}
        onPress={() => promptAsync()}
        disabled={!request || busy || !googleConfigured}
      >
        <View style={styles.googleButtonInner}>
          <AntDesign name="google" size={18} color="#0f172a" />
          <Text style={styles.googleButtonText}>{googleLoading ? "Connecting..." : "Continue with Google"}</Text>
        </View>
      </Pressable>
      {!googleConfigured ? (
        <Text style={styles.hint}>Google/Firebase auth not configured. Set EXPO_PUBLIC_FIREBASE_* and EXPO_PUBLIC_GOOGLE_* IDs.</Text>
      ) : null}
      <Pressable style={[styles.primary, styles.quick]} onPress={onQuickSignIn} disabled={busy}>
        <Text style={styles.primaryText}>{busy ? "Signing in..." : "Quick Sign-In (Default User)"}</Text>
      </Pressable>
      <TextInput style={styles.input} placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <Pressable style={styles.primary} onPress={onSend} disabled={busy || !email.trim()}>
        <Text style={styles.primaryText}>{loading && !sent ? "Sending..." : "Send Magic Link / OTP"}</Text>
      </Pressable>

      <TextInput style={styles.input} placeholder="Code" value={code} onChangeText={setCode} editable={sent && !busy} />
      <Pressable style={[styles.primary, !sent && styles.disabled]} onPress={onVerify} disabled={busy || !sent || !code.trim()}>
        <Text style={styles.primaryText}>{loading && sent ? "Verifying..." : "Verify & Sign In"}</Text>
      </Pressable>
      {statusText ? <Text style={styles.status}>{statusText}</Text> : null}
      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
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
  quick: { backgroundColor: "#334155" },
  googleButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "white",
  },
  googleButtonText: { color: "#0f172a", fontWeight: "700" },
  googleButtonInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  primaryText: { color: "white", fontWeight: "700" },
  disabled: { opacity: 0.5 },
  status: { color: "#334155", textAlign: "center" },
  error: { color: "#b91c1c", textAlign: "center" },
  hint: { color: "#64748b", textAlign: "center", fontSize: 12 },
});
