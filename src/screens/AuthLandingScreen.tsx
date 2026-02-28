import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

import { track } from "@/analytics/track";
import { useAuth } from "@/auth/AuthContext";
import { firebaseConfigReady } from "@/auth/firebase";

WebBrowser.maybeCompleteAuthSession();

type Props = {
  navigation: { navigate: (route: "EmailAuth" | "LegacyLogin") => void };
};

export default function AuthLandingScreen({ navigation }: Props): React.JSX.Element {
  const { loginGoogle } = useAuth();
  const enableGoogleLogin = process.env.EXPO_PUBLIC_ENABLE_GOOGLE_LOGIN === "true";
  const enableLegacyLogin = process.env.EXPO_PUBLIC_ENABLE_LEGACY_LOGIN === "true";
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const googleConfigured = enableGoogleLogin && firebaseConfigReady && Boolean(googleIosClientId || googleAndroidClientId || googleWebClientId);
  const [loadingGoogle, setLoadingGoogle] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>("");

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
        setErrorText("Google sign-in was cancelled.");
      }
      return;
    }

    const finishGoogleSignIn = async () => {
      try {
        setLoadingGoogle(true);
        setErrorText("");
        const idToken = response.authentication?.idToken;
        const accessToken = response.authentication?.accessToken;
        await loginGoogle(idToken, accessToken);
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : "Google sign-in failed.");
      } finally {
        setLoadingGoogle(false);
      }
    };

    void finishGoogleSignIn();
  }, [loginGoogle, response]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.subtitle}>Low-frequency. You stay in control.</Text>

      {enableGoogleLogin ? (
        <Pressable
          accessibilityLabel="Continue with Google"
          style={[styles.googleButton, (!request || loadingGoogle || !googleConfigured) && styles.disabled]}
          disabled={!request || loadingGoogle || !googleConfigured}
          onPress={() => {
            track("auth_google_tapped");
            void promptAsync();
          }}
        >
          <View style={styles.googleInner}>
            <AntDesign name="google" size={18} color="#0f172a" />
            <Text style={styles.googleText}>{loadingGoogle ? "Connecting..." : "Continue with Google"}</Text>
          </View>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityLabel="Continue with Email"
        style={styles.primaryButton}
        onPress={() => navigation.navigate("EmailAuth")}
      >
        <Text style={styles.primaryText}>Continue with Email</Text>
      </Pressable>

      {enableLegacyLogin ? (
        <Pressable
          accessibilityLabel="Use default login"
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("LegacyLogin")}
        >
          <Text style={styles.secondaryText}>Use Default Login</Text>
        </Pressable>
      ) : null}

      {enableGoogleLogin && !googleConfigured ? <Text style={styles.helper}>Set EXPO_PUBLIC_GOOGLE_* and Firebase env vars to enable Google sign-in.</Text> : null}
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
    gap: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 8,
  },
  googleButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  googleInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  googleText: { color: "#0f172a", fontWeight: "600", fontSize: 15 },
  primaryButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "white", fontWeight: "600", fontSize: 15 },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: "#0f172a", fontWeight: "600", fontSize: 14 },
  helper: { fontSize: 12, color: "#64748b", textAlign: "center" },
  error: { fontSize: 13, color: "#b91c1c", textAlign: "center" },
  disabled: { opacity: 0.5 },
});
