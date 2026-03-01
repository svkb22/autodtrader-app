import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

import { useAuth } from "@/auth/AuthContext";
import { firebaseConfigReady } from "@/auth/firebase";

WebBrowser.maybeCompleteAuthSession();

type Props = {
  navigation: { navigate: (route: "EmailAuth") => void };
};

export default function AuthLandingScreen({ navigation }: Props): React.JSX.Element {
  const { loginGoogle } = useAuth();
  const [loadingGoogle, setLoadingGoogle] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>("");

  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const enableGoogleLogin = process.env.EXPO_PUBLIC_ENABLE_GOOGLE_LOGIN !== "false";

  const googleConfigured =
    enableGoogleLogin &&
    firebaseConfigReady &&
    Boolean(googleIosClientId || googleAndroidClientId || googleWebClientId);

  const [request, _response, promptAsync] = Google.useAuthRequest({
    iosClientId: googleIosClientId,
    androidClientId: googleAndroidClientId,
    webClientId: googleWebClientId,
    scopes: ["openid", "profile", "email"],
  });

  const onGooglePress = async () => {
    if (!request || loadingGoogle || !googleConfigured) return;
    try {
      setLoadingGoogle(true);
      setErrorText("");
      const result = await promptAsync();
      if (result.type !== "success") {
        setErrorText(result.type === "cancel" || result.type === "dismiss" ? "Google sign-in cancelled." : "Google sign-in failed.");
        return;
      }

      const idToken = result.authentication?.idToken ?? result.params?.id_token ?? null;
      const accessToken = result.authentication?.accessToken ?? result.params?.access_token ?? null;

      if (!idToken && !accessToken) {
        setErrorText("Google auth returned no token.");
        return;
      }

      await loginGoogle(idToken, accessToken);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Google sign-in failed.");
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Systematic trading. Built for control.</Text>
      <Text style={styles.subtitle}>Low-frequency setups. Disciplined execution. You approve every trade.</Text>
      <Text style={styles.trust}>Secure OAuth authentication. Broker credentials are never stored.</Text>

      {enableGoogleLogin ? (
        <Pressable
          accessibilityLabel="Continue with Google"
          style={[styles.googleButton, (!request || loadingGoogle || !googleConfigured) && styles.disabled]}
          disabled={!request || loadingGoogle || !googleConfigured}
          onPress={onGooglePress}
        >
          <View style={styles.googleInner}>
            <Image
              source={require("../../assets/icons/google-g.png")}
              style={styles.googleLogo}
              resizeMode="contain"
            />
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
    lineHeight: 38,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 14,
    color: "#334155",
  },
  trust: {
    fontSize: 12,
    color: "#64748b",
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
  googleLogo: { width: 18, height: 18 },
  googleText: { color: "#0f172a", fontWeight: "600", fontSize: 15 },
  primaryButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "white", fontWeight: "600", fontSize: 15 },
  error: { fontSize: 13, color: "#b91c1c", textAlign: "center" },
  disabled: { opacity: 0.5 },
});
