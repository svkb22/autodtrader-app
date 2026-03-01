import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuthSession } from "@/auth/tokenStore";

export type BrokerMode = "paper" | "live";

const LEGACY_KEY = "broker.active_mode";

async function getScopedKey(): Promise<string> {
  const { userId } = await getAuthSession();
  return userId ? `${LEGACY_KEY}:${userId}` : LEGACY_KEY;
}

async function readMode(key: string): Promise<BrokerMode | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  return raw === "live" ? "live" : "paper";
}

export async function getActiveBrokerMode(): Promise<BrokerMode> {
  try {
    const scopedKey = await getScopedKey();
    const scoped = await readMode(scopedKey);
    if (scoped) return scoped;

    // Backward-compatible fallback for pre-user-scoped installs.
    const legacy = await readMode(LEGACY_KEY);
    if (legacy) {
      await AsyncStorage.setItem(scopedKey, legacy);
      if (scopedKey !== LEGACY_KEY) {
        await AsyncStorage.removeItem(LEGACY_KEY);
      }
      return legacy;
    }

    return "paper";
  } catch {
    return "paper";
  }
}

export async function setActiveBrokerMode(mode: BrokerMode): Promise<void> {
  const scopedKey = await getScopedKey();
  await AsyncStorage.setItem(scopedKey, mode);
}

export async function clearActiveBrokerMode(): Promise<void> {
  const scopedKey = await getScopedKey();
  await AsyncStorage.removeItem(scopedKey);
}
