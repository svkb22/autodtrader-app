function parseBool(value: string | undefined, fallback = false): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export const ENABLE_LIVE_BROKER = parseBool(process.env.EXPO_PUBLIC_ENABLE_LIVE_BROKER, false);
