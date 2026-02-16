import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { alpacaConnect, toApiError } from "@/api/client";

type Props = {
  navigation: { navigate: (route: "RiskSettings") => void };
};

export default function ConnectBrokerScreen({ navigation }: Props): JSX.Element {
  const [env, setEnv] = useState<"paper" | "live">("paper");
  const [apiKey, setApiKey] = useState<string>("");
  const [apiSecret, setApiSecret] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const onConnect = async () => {
    try {
      setLoading(true);
      await alpacaConnect(env, apiKey.trim(), apiSecret.trim());
      Alert.alert("Connected", `Alpaca ${env} connected.`);
      navigation.navigate("RiskSettings");
    } catch (error) {
      Alert.alert("Connect failed", toApiError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Environment</Text>
      <View style={styles.row}>
        <Pressable style={[styles.pill, env === "paper" && styles.activePill]} onPress={() => setEnv("paper")}>
          <Text style={[styles.pillText, env === "paper" && styles.activePillText]}>Paper</Text>
        </Pressable>
        <Pressable style={[styles.pill, env === "live" && styles.activePill]} onPress={() => setEnv("live")}>
          <Text style={[styles.pillText, env === "live" && styles.activePillText]}>Live</Text>
        </Pressable>
      </View>

      <TextInput style={styles.input} placeholder="Alpaca API Key" value={apiKey} onChangeText={setApiKey} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Alpaca API Secret" value={apiSecret} onChangeText={setApiSecret} autoCapitalize="none" secureTextEntry />

      <Pressable style={styles.button} onPress={onConnect} disabled={loading || !apiKey || !apiSecret}>
        <Text style={styles.buttonText}>Connect Broker</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12, backgroundColor: "#f8fafc" },
  label: { fontWeight: "700", color: "#1f2937" },
  row: { flexDirection: "row", gap: 8 },
  pill: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "white",
  },
  activePill: { backgroundColor: "#0f172a", borderColor: "#0f172a" },
  pillText: { color: "#334155", fontWeight: "600" },
  activePillText: { color: "white" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "white",
  },
  button: {
    backgroundColor: "#0f172a",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "700" },
});
