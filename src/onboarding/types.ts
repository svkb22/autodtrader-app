export type ActivationMode = "paper" | "live";

export type NotificationsStatus = "granted" | "denied" | "not_determined";

export type CapitalLimitMode = "usd" | "pct";

export type RiskDraft = {
  capital_limit_mode: CapitalLimitMode;
  capital_limit_value: number;
  max_daily_loss_usd: number;
  max_trades_per_day: number;
  auto_approve_enabled: boolean;
  auto_approve_mode: "off" | "strong_only";
};

export type OnboardingPersisted = {
  version: number;
  completed: boolean;
  completed_at: string | null;
  activation_mode: ActivationMode | null;
};

export type OnboardingDraftState = {
  mode: ActivationMode;
  brokerConnected: boolean;
  riskConfigured: boolean;
  notificationsStatus: NotificationsStatus;
  riskDraft: RiskDraft;
};
