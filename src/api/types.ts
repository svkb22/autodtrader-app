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

export type RiskProfile = {
  max_daily_loss_usd: number;
  risk_per_trade_usd: number;
  max_trades_per_day: number;
  max_notional_pct: number;
  kill_switch_enabled: boolean;
};

export type RiskProfileUpdate = Partial<RiskProfile>;

export type ProposalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "blocked"
  | "executed";

export type Proposal = {
  id: string;
  symbol: string;
  side: string;
  qty: number;
  stop_loss_pct: number;
  take_profit_pct: number;
  last_price_snapshot: number;
  score: number;
  status: ProposalStatus;
  expires_at: string;
  created_at: string;
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

export type ProposalDecisionResult = {
  proposal_id: string;
  status: "approved" | "rejected" | "expired" | "blocked";
  message: string;
  order: Order | null;
};
