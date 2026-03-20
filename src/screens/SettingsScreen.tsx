import React, { useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { NavigationProp, ParamListBase, useNavigation } from "@react-navigation/native";
import Constants from "expo-constants";

import { useAuth } from "@/auth/AuthContext";
import BrandBackdrop from "@/components/BrandBackdrop";
import BrandLockup from "@/components/BrandLockup";
import { prudexTheme, surfaceCard } from "@/theme/prudex";

type SettingsItemProps = {
  title: string;
  subtitle: string;
  onPress: () => void;
};

function SettingsItem({ title, subtitle, onPress }: SettingsItemProps): React.JSX.Element {
  return (
    <Pressable style={styles.cardButton} onPress={onPress}>
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export default function SettingsScreen(): React.JSX.Element {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { signOut } = useAuth();
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
      <BrandBackdrop />

      <View style={styles.brandCard}>
        <BrandLockup variant="header" showTagline />
        <Text style={styles.brandBody}>System controls for venue access, execution posture, and risk guardrails.</Text>
      </View>

      <Text style={styles.sectionLabel}>Execution</Text>
      <SettingsItem
        title="Execution Venues"
        subtitle="Broker connectivity, active environment, and connection state."
        onPress={() => navigation.navigate("Brokers")}
      />
      <SettingsItem
        title="Auto Execution"
        subtitle="Control whether eligible setups may execute automatically within safeguards."
        onPress={() => navigation.navigate("AutoExecuteSettings")}
      />

      <Text style={styles.sectionLabel}>Risk Controls</Text>
      <SettingsItem
        title="Risk Limits"
        subtitle="Daily loss, risk per trade, capital usage, and execution pause controls."
        onPress={() => navigation.navigate("RiskSettings")}
      />

      <Text style={styles.sectionLabel}>Account</Text>
      <View style={styles.metaCard}>
        <Text style={styles.metaLabel}>App Version</Text>
        <Text style={styles.metaValue}>{Constants.expoConfig?.version ?? "0.1.0"}</Text>
      </View>
      <Pressable style={[styles.logoutButton, loggingOut && styles.disabled]} onPress={onLogout} disabled={loggingOut}>
        <Text style={styles.logoutText}>{loggingOut ? "Logging out..." : "Log Out"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: prudexTheme.colors.bg,
    padding: 16,
    gap: 12,
  },
  brandCard: {
    ...surfaceCard,
    backgroundColor: prudexTheme.colors.surfaceElevated,
    padding: 16,
    gap: 8,
    ...prudexTheme.shadow.glow,
  },
  brandBody: {
    color: prudexTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionLabel: {
    color: prudexTheme.colors.textSubtle,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 2,
  },
  cardButton: {
    ...surfaceCard,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardCopy: {
    flex: 1,
  },
  cardTitle: {
    color: prudexTheme.colors.text,
    fontWeight: "700",
    fontSize: 16,
  },
  cardSubtitle: {
    color: prudexTheme.colors.textSubtle,
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
  },
  chevron: {
    color: prudexTheme.colors.textSubtle,
    fontSize: 22,
    lineHeight: 22,
  },
  metaCard: {
    ...surfaceCard,
    padding: 12,
    gap: 4,
  },
  metaLabel: {
    color: prudexTheme.colors.textSubtle,
    fontSize: 12,
    fontWeight: "600",
  },
  metaValue: {
    color: prudexTheme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  logoutButton: {
    marginTop: 2,
    backgroundColor: prudexTheme.colors.surface,
    borderWidth: 1,
    borderColor: "#5E2B2B",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  logoutText: {
    color: prudexTheme.colors.negative,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.6,
  },
});
