import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "autodtrader.auth.token";
const USER_ID_KEY = "autodtrader.auth.user_id";

async function canUseSecureStore(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function setAuthSession(token: string, userId: string): Promise<void> {
  if (await canUseSecureStore()) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_ID_KEY, userId);
    return;
  }
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USER_ID_KEY, userId],
  ]);
}

export async function getAuthSession(): Promise<{ token: string | null; userId: string | null }> {
  if (await canUseSecureStore()) {
    const [token, userId] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(USER_ID_KEY),
    ]);
    return { token, userId };
  }
  const values = await AsyncStorage.multiGet([TOKEN_KEY, USER_ID_KEY]);
  const map = new Map(values);
  return { token: map.get(TOKEN_KEY) ?? null, userId: map.get(USER_ID_KEY) ?? null };
}

export async function clearAuthSession(): Promise<void> {
  if (await canUseSecureStore()) {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_ID_KEY),
    ]);
    return;
  }
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_ID_KEY]);
}
