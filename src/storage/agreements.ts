import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuthSession } from "@/auth/tokenStore";

export type StocksAgreementState = {
  stocksAgreementAccepted: boolean;
  stocksAgreementAcceptedAt: string | null;
  stocksAgreementVersion: "v1";
};

const LEGACY_STORAGE_KEY = "agreements.stocks.v1";

async function getScopedStorageKey(): Promise<string> {
  const { userId } = await getAuthSession();
  return userId ? `${LEGACY_STORAGE_KEY}:${userId}` : LEGACY_STORAGE_KEY;
}

const DEFAULT_STATE: StocksAgreementState = {
  stocksAgreementAccepted: false,
  stocksAgreementAcceptedAt: null,
  stocksAgreementVersion: "v1",
};

export async function getStocksAgreementState(): Promise<StocksAgreementState> {
  const scopedKey = await getScopedStorageKey();
  const raw = await AsyncStorage.getItem(scopedKey);
  if (!raw) {
    // Backward-compatible fallback for pre-user-scoped installs.
    const legacy = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return DEFAULT_STATE;
    await AsyncStorage.setItem(scopedKey, legacy);
    if (scopedKey !== LEGACY_STORAGE_KEY) {
      await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    return parseAgreement(legacy);
  }

  return parseAgreement(raw);
}

function parseAgreement(raw: string): StocksAgreementState {
  try {
    const parsed = JSON.parse(raw) as Partial<StocksAgreementState>;
    return {
      stocksAgreementAccepted: Boolean(parsed.stocksAgreementAccepted),
      stocksAgreementAcceptedAt: parsed.stocksAgreementAcceptedAt ?? null,
      stocksAgreementVersion: "v1",
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export async function setStocksAgreementAccepted(version: "v1", acceptedAt: string): Promise<StocksAgreementState> {
  const next: StocksAgreementState = {
    stocksAgreementAccepted: true,
    stocksAgreementAcceptedAt: acceptedAt,
    stocksAgreementVersion: version,
  };

  const scopedKey = await getScopedStorageKey();
  await AsyncStorage.setItem(scopedKey, JSON.stringify(next));
  return next;
}

export async function clearStocksAgreementState(): Promise<void> {
  const scopedKey = await getScopedStorageKey();
  await AsyncStorage.removeItem(scopedKey);
}
