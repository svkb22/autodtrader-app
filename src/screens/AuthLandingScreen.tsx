import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  navigation: { navigate: (route: "EmailAuth") => void };
};

export default function AuthLandingScreen({ navigation }: Props): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.subtitle}>Low-frequency. You stay in control.</Text>

      <Pressable
        accessibilityLabel="Continue with Email"
        style={styles.primaryButton}
        onPress={() => navigation.navigate("EmailAuth")}
      >
        <Text style={styles.primaryText}>Continue with Email</Text>
      </Pressable>
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
  primaryButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "white", fontWeight: "600", fontSize: 15 },
});
