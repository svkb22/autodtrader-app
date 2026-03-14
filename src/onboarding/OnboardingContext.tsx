import React, { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";

import { getBrokerStatus } from "@/api/broker";
import { useAuth } from "@/auth/AuthContext";
import { clearOnboardingState, getOnboardingState, setOnboardingCompleted } from "@/onboarding/storage";
import { OnboardingDraftState, NotificationsStatus, RiskDraft } from "@/onboarding/types";

type OnboardingContextValue = {
  ready: boolean;
  completed: boolean;
  completedAt: string | null;
  activationMode: "paper" | "live" | null;
  draft: OnboardingDraftState;
  setMode: (mode: "paper" | "live") => void;
  setBrokerConnected: (connected: boolean) => void;
  setRiskDraft: (draft: Partial<RiskDraft>) => void;
  setRiskConfigured: (configured: boolean) => void;
  setNotificationsStatus: (status: NotificationsStatus) => void;
  markCompleted: (mode: "paper" | "live") => Promise<void>;
  resetForLogout: () => Promise<void>;
};

const defaultRiskDraft: RiskDraft = {
  capital_limit_mode: "usd",
  capital_limit_value: 500,
  max_daily_loss_usd: 50,
  max_trades_per_day: 1,
  auto_approve_enabled: false,
  auto_approve_mode: "off",
};

const defaultDraft: OnboardingDraftState = {
  mode: "paper",
  brokerConnected: false,
  riskConfigured: false,
  notificationsStatus: "not_determined",
  riskDraft: defaultRiskDraft,
};

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

function bootNow(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function logBoot(stage: string, startedAt: number): void {
  const elapsed = bootNow() - startedAt;
  console.info(`[boot][onboarding] ${stage} ${elapsed.toFixed(1)}ms`);
}

export function OnboardingProvider({ children }: PropsWithChildren): React.JSX.Element {
  const bootStartedAt = useMemo(() => bootNow(), []);
  const { authState, loading: authLoading, userId } = useAuth();
  const [ready, setReady] = useState<boolean>(false);
  const [completed, setCompleted] = useState<boolean>(false);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [activationMode, setActivationMode] = useState<"paper" | "live" | null>(null);
  const [draft, setDraft] = useState<OnboardingDraftState>(defaultDraft);

  useEffect(() => {
    let mounted = true;
    if (authLoading) {
      return () => {
        mounted = false;
      };
    }

    setReady(false);

    if (authState !== "signedIn_verified" || !userId) {
      setCompleted(false);
      setCompletedAt(null);
      setActivationMode(null);
      setDraft(defaultDraft);
      setReady(true);
      logBoot("ready_signed_out_or_unverified", bootStartedAt);
      return () => {
        mounted = false;
      };
    }

    logBoot("load:start", bootStartedAt);
    getOnboardingState()
      .then(async (state) => {
        logBoot("load:storage_ready", bootStartedAt);
        if (!mounted) return;
        let resolved = state;
        if (!state.completed) {
          try {
            const broker = await getBrokerStatus();
            logBoot("load:broker_status_ready", bootStartedAt);
            const liveConnected = Boolean(broker?.alpaca?.live?.connected);
            const paperConnected = Boolean(broker?.alpaca?.paper?.connected);
            if (liveConnected || paperConnected) {
              resolved = await setOnboardingCompleted(liveConnected ? "live" : "paper");
            }
          } catch {
            // Keep onboarding flow if broker lookup fails.
          }
        }
        setCompleted(resolved.completed);
        setCompletedAt(resolved.completed_at);
        setActivationMode(resolved.activation_mode);
        setDraft(defaultDraft);
      })
      .finally(() => {
        if (mounted) {
          setReady(true);
          logBoot("load:complete", bootStartedAt);
        }
      });

    return () => {
      mounted = false;
    };
  }, [authLoading, authState, userId]);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      ready,
      completed,
      completedAt,
      activationMode,
      draft,
      setMode: (mode) => {
        setDraft((prev) => ({ ...prev, mode }));
      },
      setBrokerConnected: (connected) => {
        setDraft((prev) => ({ ...prev, brokerConnected: connected }));
      },
      setRiskDraft: (partial) => {
        setDraft((prev) => ({ ...prev, riskDraft: { ...prev.riskDraft, ...partial } }));
      },
      setRiskConfigured: (configured) => {
        setDraft((prev) => ({ ...prev, riskConfigured: configured }));
      },
      setNotificationsStatus: (status) => {
        setDraft((prev) => ({ ...prev, notificationsStatus: status }));
      },
      markCompleted: async (mode) => {
        const persisted = await setOnboardingCompleted(mode);
        setCompleted(persisted.completed);
        setCompletedAt(persisted.completed_at);
        setActivationMode(persisted.activation_mode);
      },
      resetForLogout: async () => {
        await clearOnboardingState();
        setCompleted(false);
        setCompletedAt(null);
        setActivationMode(null);
        setDraft(defaultDraft);
      },
    }),
    [activationMode, completed, completedAt, draft, ready]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const value = useContext(OnboardingContext);
  if (!value) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return value;
}
