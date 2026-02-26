import React, { useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { NavigationProp, ParamListBase, useNavigation } from "@react-navigation/native";

import { useAuth } from "@/auth/AuthContext";

export default function SettingsScreen(): React.JSX.Element {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { signOut, userId } = useAuth();
  const [loggingOut, setLoggingOut] = useState<boolean>(false);

  const performLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
    } finally {
      setLoggingOut(false);
    }
  };

  const onLogout = () => {
    if (Platform.OS === "web") {
      const accepted = typeof window !== "undefined" ? window.confirm("Are you sure you want to log out?") : true;
      if (accepted) {
        void performLogout();
      }
      return;
    }

    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => void performLogout(),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.sectionLabel}>Broker</Text>
      <Pressable style={styles.cardButton} onPress={() => navigation.navigate("Brokers")}>
        <View>
          <Text style={styles.cardTitle}>Brokers</Text>
          <Text style={styles.cardSubtitle}>Active connections, add new, and manage broker-level settings.</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Text style={styles.sectionLabel}>Account</Text>
      {userId ? (
        <View style={styles.debugCard}>
          <Text style={styles.debugLabel}>User ID</Text>
          <Text selectable style={styles.debugValue}>
            {userId}
          </Text>
        </View>
      ) : null}
      <Pressable style={[styles.logoutButton, loggingOut && styles.disabled]} onPress={onLogout} disabled={loggingOut}>
        <Text style={styles.logoutText}>{loggingOut ? "Logging out..." : "Log Out"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "800", color: "#0f172a", marginBottom: 4 },
  sectionLabel: { color: "#334155", fontWeight: "600" },
  cardButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "white",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitle: { color: "#0f172a", fontWeight: "700", fontSize: 16 },
  cardSubtitle: { color: "#64748b", marginTop: 3, fontSize: 13 },
  chevron: { color: "#94a3b8", fontSize: 22, lineHeight: 22 },
  debugCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "white",
    padding: 12,
    gap: 4,
  },
  debugLabel: { color: "#64748b", fontSize: 12, fontWeight: "600" },
  debugValue: { color: "#0f172a", fontSize: 12, fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }) },
  logoutButton: {
    marginTop: 2,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  logoutText: { color: "#b91c1c", fontWeight: "700" },
  disabled: { opacity: 0.6 },
});
