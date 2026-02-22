import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import { AuthUser } from "@/api/types";

const TOKEN_KEY = "autodtrader.auth.token";
const USER_ID_KEY = "autodtrader.auth.user_id";
const USER_KEY = "autodtrader.auth.user";
const PROVIDER_KEY = "autodtrader.auth.provider";

export type SessionProvider = "firebase" | "legacy";

async function canUseSecureStore(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function setAuthSession(token: string, user: AuthUser, provider: SessionProvider = "firebase"): Promise<void> {
  const userJson = JSON.stringify(user);
  if (await canUseSecureStore()) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_ID_KEY, user.id);
    await SecureStore.setItemAsync(USER_KEY, userJson);
    await SecureStore.setItemAsync(PROVIDER_KEY, provider);
    return;
  }
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USER_ID_KEY, user.id],
    [USER_KEY, userJson],
    [PROVIDER_KEY, provider],
  ]);
}

export async function getAuthSession(): Promise<{ token: string | null; userId: string | null; user: AuthUser | null; provider: SessionProvider | null }> {
  const parseUser = (raw: string | null): AuthUser | null => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as AuthUser;
      if (!parsed?.id) return null;
      return {
        id: parsed.id,
        email: parsed.email ?? "",
        name: parsed.name ?? null,
        picture: parsed.picture ?? null,
      };
    } catch {
      return null;
    }
  };

  const parseProvider = (raw: string | null): SessionProvider | null => {
    if (raw === "firebase" || raw === "legacy") return raw;
    return null;
  };

  if (await canUseSecureStore()) {
    const [token, userId, userRaw, providerRaw] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(USER_ID_KEY),
      SecureStore.getItemAsync(USER_KEY),
      SecureStore.getItemAsync(PROVIDER_KEY),
    ]);
    return { token, userId, user: parseUser(userRaw), provider: parseProvider(providerRaw) };
  }
  const values = await AsyncStorage.multiGet([TOKEN_KEY, USER_ID_KEY, USER_KEY, PROVIDER_KEY]);
  const map = new Map(values);
  return {
    token: map.get(TOKEN_KEY) ?? null,
    userId: map.get(USER_ID_KEY) ?? null,
    user: parseUser(map.get(USER_KEY) ?? null),
    provider: parseProvider(map.get(PROVIDER_KEY) ?? null),
  };
}

export async function clearAuthSession(): Promise<void> {
  if (await canUseSecureStore()) {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_ID_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
      SecureStore.deleteItemAsync(PROVIDER_KEY),
    ]);
    return;
  }
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_ID_KEY, USER_KEY, PROVIDER_KEY]);
}
