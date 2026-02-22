import AsyncStorage from "@react-native-async-storage/async-storage";

export type StocksAgreementState = {
  stocksAgreementAccepted: boolean;
  stocksAgreementAcceptedAt: string | null;
  stocksAgreementVersion: "v1";
};

const STORAGE_KEY = "agreements.stocks.v1";

const DEFAULT_STATE: StocksAgreementState = {
  stocksAgreementAccepted: false,
  stocksAgreementAcceptedAt: null,
  stocksAgreementVersion: "v1",
};

export async function getStocksAgreementState(): Promise<StocksAgreementState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_STATE;

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

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
