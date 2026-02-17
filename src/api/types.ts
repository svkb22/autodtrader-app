export type Platform = "ios" | "android";

export type AuthSession = {
  token: string;
  user_id: string;
};

export type BrokerAccount = {
  id: string;
  equity: string;
  buying_power: string;
  status: string;
  currency: string;
};

export type AutoExecuteStrength = "strong_only" | "strong_medium" | "all";

export type BrokerSettings = {
  auto_execute_enabled: boolean;
  auto_execute_strength: AutoExecuteStrength;
  auto_execute_after_seconds: number;
};

export type BrokerSettingsUpdate = Partial<BrokerSettings>;

export type RiskProfile = {
  max_daily_loss_usd: number;
  risk_per_trade_usd: number;
  max_trades_per_day: number;
  max_notional_pct: number;
  kill_switch_enabled: boolean;
  proposals_per_day_cap: number;
  cooldown_minutes: number;
  trade_window_start_et: string;
  trade_window_end_et: string;
  avoid_open_minutes: number;
  avoid_close_minutes: number;
  regime_filter_enabled: boolean;
};

export type RiskProfileUpdate = Partial<RiskProfile>;

export type ProposalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "blocked"
  | "executed";

export type ProposalStrength = "strong" | "medium" | "low";

export type ProposalEntry = {
  type: "limit";
  limit_price: number;
};

export type Proposal = {
  id: string;
  symbol: string;
  side: string;
  qty: number;
  stop_loss_pct: number;
  take_profit_pct: number;
  last_price_snapshot: number;
  score: number;
  strength: ProposalStrength;
  rationale: string[];
  capital_used_pct: number;
  daily_risk_remaining_usd: number;
  entry: ProposalEntry;
  event_risk_level?: "none" | "earnings" | "macro_high" | "macro_medium" | null;
  event_risk_reason?: string | null;
  blocked_reason?: string | null;
  status: ProposalStatus;
  expires_at: string;
  created_at: string;
  decision_at?: string | null;
  ended_reason?: string | null;
};

export type ProposalHistoryRisk = {
  max_loss_usd: number;
  target_usd: number;
};

export type ProposalHistoryPrices = {
  entry_limit_price: number | null;
  stop_loss_price: number | null;
  take_profit_price: number | null;
  filled_avg_price: number | null;
  filled_at: string | null;
};

export type ProposalHistoryOrderSummary = {
  alpaca_order_id: string;
  status: string;
  submitted_at: string;
  filled_at: string | null;
  avg_fill_price: number | null;
};

export type ProposalHistoryItem = {
  id: string;
  created_at: string;
  status: ProposalStatus;
  symbol: string;
  side: string;
  qty: number;
  strength: ProposalStrength;
  expires_at: string;
  decision_at: string | null;
  rationale: string[];
  risk: ProposalHistoryRisk;
  prices: ProposalHistoryPrices;
  order_summary?: ProposalHistoryOrderSummary | null;
  reason?: string | null;
};

export type ProposalHistoryResponse = {
  items: ProposalHistoryItem[];
  next_cursor: string | null;
};

export type Order = {
  id: string;
  alpaca_order_id: string;
  client_order_id: string;
  symbol: string;
  qty: number;
  side: string;
  type: string;
  order_class: string;
  status: string;
  submitted_at: string;
  filled_at: string | null;
  avg_fill_price: number | null;
  take_profit_price: number;
  stop_loss_price: number;
};

export type OrderOutcome = {
  order_id: string;
  symbol: string;
  qty: number;
  entry_price: number;
  mark_price: number;
  entry_notional: number;
  unrealized_pnl: number;
  realized_pnl: number;
  state: "open" | "closed";
  updated_at: string;
};

export type ProposalDecisionResult = {
  proposal_id: string;
  status: "approved" | "rejected" | "expired" | "blocked";
  message: string;
  order: Order | null;
};
