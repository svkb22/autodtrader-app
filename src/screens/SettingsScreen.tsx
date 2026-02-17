import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

type Nav = {
  navigate: (screen: "ConnectBroker" | "RiskSettings" | "AutoExecuteSettings") => void;
};

export default function SettingsScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Pressable style={styles.item} onPress={() => navigation.navigate("ConnectBroker")}>
        <Text style={styles.itemText}>Broker Connection</Text>
      </Pressable>
      <Pressable style={styles.item} onPress={() => navigation.navigate("RiskSettings")}>
        <Text style={styles.itemText}>Risk Settings</Text>
      </Pressable>
      <Pressable style={styles.item} onPress={() => navigation.navigate("AutoExecuteSettings")}>
        <Text style={styles.itemText}>Auto Execution</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16, gap: 10 },
  title: { fontSize: 24, fontWeight: "800", color: "#0f172a", marginBottom: 6 },
  item: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  itemText: { color: "#0f172a", fontWeight: "700" },
});
