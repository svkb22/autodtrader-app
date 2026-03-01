import AsyncStorage from "@react-native-async-storage/async-storage";

export type BrokerMode = "paper" | "live";

const KEY = "broker.active_mode";

export async function getActiveBrokerMode(): Promise<BrokerMode> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw === "live" ? "live" : "paper";
  } catch {
    return "paper";
  }
}

export async function setActiveBrokerMode(mode: BrokerMode): Promise<void> {
  await AsyncStorage.setItem(KEY, mode);
}
