import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { alpacaConnectWithCredentials, toApiError } from "@/api/client";

type Props = {
  navigation: { navigate: (route: "RiskSettings") => void };
};

export default function ConnectBrokerScreen({ navigation }: Props): React.JSX.Element {
  const [env, setEnv] = useState<"paper" | "live">("paper");
  const [username, setUsername] = useState<string>("placeholder");
  const [password, setPassword] = useState<string>("placeholder");
  const [loading, setLoading] = useState<boolean>(false);

  const onConnect = async () => {
    try {
      setLoading(true);
      await alpacaConnectWithCredentials(env, username.trim(), password.trim());
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

      <Text style={styles.hint}>Sign in with Alpaca credentials</Text>
      <TextInput style={styles.input} placeholder="Alpaca Username / Email" value={username} onChangeText={setUsername} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Alpaca Password" value={password} onChangeText={setPassword} autoCapitalize="none" secureTextEntry />
      <Text style={styles.subtle}>Tip: backend env keys are used when configured. Placeholder values are okay for MVP.</Text>

      <Pressable style={styles.button} onPress={onConnect} disabled={loading || !username.trim() || !password.trim()}>
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
  hint: { color: "#475569", fontSize: 12 },
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
  subtle: { color: "#64748b", fontSize: 12 },
});
