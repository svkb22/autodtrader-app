import AsyncStorage from "@react-native-async-storage/async-storage";

import { OnboardingPersisted } from "@/onboarding/types";

const ONBOARDING_KEY = "onboarding.state.v1";

export const ONBOARDING_VERSION = 1;

const defaultState: OnboardingPersisted = {
  version: ONBOARDING_VERSION,
  completed: false,
  completed_at: null,
  activation_mode: null,
};

export async function getOnboardingState(): Promise<OnboardingPersisted> {
  const raw = await AsyncStorage.getItem(ONBOARDING_KEY);
  if (!raw) return defaultState;

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
  await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(next));
  return next;
}

export async function clearOnboardingState(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_KEY);
}
