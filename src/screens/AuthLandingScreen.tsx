import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

import { useAuth } from "@/auth/AuthContext";
import { firebaseConfigReady } from "@/auth/firebase";
import BrandLockup from "@/components/BrandLockup";
import { prudexTheme, surfaceCard } from "@/theme/prudex";

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
      <View style={styles.heroCard}>
        <BrandLockup variant="hero" showTagline />
        <Text style={styles.title}>Execute with discipline.</Text>
        <Text style={styles.subtitle}>Structured setups. Risk-defined entries. You stay in control.</Text>
        <Text style={styles.trust}>Secure broker connection. Credentials are never stored.</Text>
      </View>

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
    backgroundColor: prudexTheme.colors.bg,
    justifyContent: "center",
    padding: prudexTheme.spacing.lg,
    gap: prudexTheme.spacing.sm,
  },
  heroCard: {
    ...surfaceCard,
    backgroundColor: prudexTheme.colors.surfaceElevated,
    padding: prudexTheme.spacing.lg,
    gap: prudexTheme.spacing.sm,
    marginBottom: prudexTheme.spacing.sm,
  },
  title: {
    fontSize: prudexTheme.typography.hero,
    lineHeight: 40,
    fontWeight: "700",
    color: prudexTheme.colors.text,
  },
  subtitle: {
    fontSize: prudexTheme.typography.bodyLg,
    color: prudexTheme.colors.textMuted,
    lineHeight: 22,
  },
  trust: {
    fontSize: prudexTheme.typography.eyebrow,
    color: prudexTheme.colors.textSubtle,
    marginBottom: 8,
  },
  googleButton: {
    minHeight: 48,
    borderRadius: prudexTheme.radius.sm,
    borderWidth: 1,
    borderColor: prudexTheme.colors.borderStrong,
    backgroundColor: prudexTheme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  googleInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  googleLogo: { width: 18, height: 18 },
  googleText: { color: prudexTheme.colors.text, fontWeight: "600", fontSize: 15 },
  primaryButton: {
    minHeight: 48,
    borderRadius: prudexTheme.radius.sm,
    backgroundColor: prudexTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: prudexTheme.colors.white, fontWeight: "700", fontSize: 15 },
  error: { fontSize: 13, color: prudexTheme.colors.negative, textAlign: "center" },
  disabled: { opacity: 0.5 },
});
