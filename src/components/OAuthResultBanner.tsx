import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { OAuthBannerState } from "@/utils/mapOAuthError";

type Props = {
  category: OAuthBannerState["category"];
  title: string;
  message: string;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
};

export default function OAuthResultBanner({ category, title, message, primaryLabel, secondaryLabel, onPrimary, onSecondary }: Props): React.JSX.Element {
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>{category === "config" ? "Setup" : "Connection"}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.actions}>
        <Pressable style={styles.primaryButton} onPress={onPrimary}>
          <Text style={styles.primaryText}>{primaryLabel}</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onSecondary}>
          <Text style={styles.secondaryText}>{secondaryLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    padding: 12,
    gap: 6,
  },
  kicker: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  title: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
  message: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    marginTop: 2,
    flexDirection: "row",
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  primaryText: {
    color: "white",
    fontWeight: "600",
    fontSize: 13,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  secondaryText: {
    color: "#0f172a",
    fontWeight: "600",
    fontSize: 13,
  },
});
