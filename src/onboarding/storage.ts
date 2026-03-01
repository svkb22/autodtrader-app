import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuthSession } from "@/auth/tokenStore";

import { OnboardingPersisted } from "@/onboarding/types";

const LEGACY_ONBOARDING_KEY = "onboarding.state.v1";

async function getScopedOnboardingKey(): Promise<string> {
  const { userId } = await getAuthSession();
  return userId ? `${LEGACY_ONBOARDING_KEY}:${userId}` : LEGACY_ONBOARDING_KEY;
}

export const ONBOARDING_VERSION = 1;

const defaultState: OnboardingPersisted = {
  version: ONBOARDING_VERSION,
  completed: false,
  completed_at: null,
  activation_mode: null,
};

export async function getOnboardingState(): Promise<OnboardingPersisted> {
  const scopedKey = await getScopedOnboardingKey();
  const raw = await AsyncStorage.getItem(scopedKey);
  if (!raw) {
    // Backward-compatible fallback for pre-user-scoped installs.
    const legacy = await AsyncStorage.getItem(LEGACY_ONBOARDING_KEY);
    if (!legacy) return defaultState;
    await AsyncStorage.setItem(scopedKey, legacy);
    if (scopedKey !== LEGACY_ONBOARDING_KEY) {
      await AsyncStorage.removeItem(LEGACY_ONBOARDING_KEY);
    }
    return parseOnboarding(legacy);
  }

  return parseOnboarding(raw);
}

function parseOnboarding(raw: string): OnboardingPersisted {
  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingPersisted>;
    if (parsed.version !== ONBOARDING_VERSION) {
      return defaultState;
    }

    return {
      version: ONBOARDING_VERSION,
      completed: Boolean(parsed.completed),
      completed_at: parsed.completed_at ?? null,
      activation_mode: parsed.activation_mode === "live" ? "live" : parsed.activation_mode === "paper" ? "paper" : null,
    };
  } catch {
    return defaultState;
  }
}

export async function setOnboardingCompleted(activationMode: "paper" | "live"): Promise<OnboardingPersisted> {
  const next: OnboardingPersisted = {
    version: ONBOARDING_VERSION,
    completed: true,
    completed_at: new Date().toISOString(),
    activation_mode: activationMode,
  };
  const scopedKey = await getScopedOnboardingKey();
  await AsyncStorage.setItem(scopedKey, JSON.stringify(next));
  return next;
}

export async function clearOnboardingState(): Promise<void> {
  const scopedKey = await getScopedOnboardingKey();
  await AsyncStorage.removeItem(scopedKey);
}
