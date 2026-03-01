import axios from "axios";

export type FinnhubCompanyContext = {
  name: string | null;
  sector: string | null;
  industry: string | null;
  marketCapUsd: number | null;
};

type CacheEntry = {
  expiresAt: number;
  value: FinnhubCompanyContext;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function getToken(): string | null {
  const v = process.env.EXPO_PUBLIC_FINNHUB_API_KEY;
  return v && v.trim().length > 0 ? v.trim() : null;
}

export async function getFinnhubCompanyContext(symbol: string): Promise<FinnhubCompanyContext | null> {
  const key = symbol.toUpperCase();
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  const token = getToken();
  if (!token) return null;

  try {
    const [profileRes, metricsRes] = await Promise.all([
      axios.get("https://finnhub.io/api/v1/stock/profile2", { params: { symbol: key, token }, timeout: 8000 }),
      axios.get("https://finnhub.io/api/v1/stock/metric", { params: { symbol: key, metric: "all", token }, timeout: 8000 }),
    ]);

    const profile = (profileRes.data ?? {}) as { name?: string; finnhubIndustry?: string; marketCapitalization?: number };
    const metrics = (metricsRes.data ?? {}) as { metric?: { marketCapitalization?: number; industry?: string; sector?: string } };

    const value: FinnhubCompanyContext = {
      name: profile.name ?? null,
      sector: metrics.metric?.sector ?? null,
      industry: profile.finnhubIndustry ?? metrics.metric?.industry ?? null,
      marketCapUsd: Number.isFinite(profile.marketCapitalization)
        ? Number(profile.marketCapitalization) * 1_000_000
        : Number.isFinite(metrics.metric?.marketCapitalization)
        ? Number(metrics.metric?.marketCapitalization) * 1_000_000
        : null,
    };

    cache.set(key, { expiresAt: now + CACHE_TTL_MS, value });
    return value;
  } catch {
    return null;
  }
}
