import axios, { AxiosError } from "axios";

import {
  AuthSession,
  FirebaseAuthResponse,
  BrokerAccount,
  BrokerStatus,
  BrokerSettings,
  BrokerSettingsUpdate,
  ExecutionRecentResponse,
  ExecutionSummary,
  Order,
  OrderOutcome,
  Platform,
  Proposal,
  ProposalHistoryItem,
  ProposalHistoryResponse,
  ProposalDecisionResult,
  RiskProfile,
  RiskProfileUpdate,
} from "@/api/types";

const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === "true";

function getBaseUrl(): string {
  const value = process.env.EXPO_PUBLIC_API_URL;
  if (value) return value;
  if (USE_MOCKS) return "http://localhost";
  throw new Error("Missing EXPO_PUBLIC_API_URL");
}

let tokenGetter: (() => string | null) | null = null;
let unauthorizedHandler: (() => void | Promise<void>) | null = null;
let unauthorizedInFlight = false;

export function setTokenGetter(getter: () => string | null): void {
  tokenGetter = getter;
}

export function setUnauthorizedHandler(handler: (() => void | Promise<void>) | null): void {
  unauthorizedHandler = handler;
}

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = tokenGetter?.();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401 && unauthorizedHandler && !unauthorizedInFlight) {
      unauthorizedInFlight = true;
      try {
        await unauthorizedHandler();
      } finally {
        unauthorizedInFlight = false;
      }
    }
    return Promise.reject(error);
  }
);

let mockRisk: RiskProfile = {
  max_daily_loss_usd: 150,
  risk_per_trade_usd: 45,
  max_trades_per_day: 1,
  max_notional_pct: 0.2,
  capital_limit_mode: "pct",
  capital_limit_value: 1.0,
  kill_switch_enabled: false,
  proposals_per_day_cap: 3,
  cooldown_minutes: 15,
  trade_window_start_et: "10:00:00",
  trade_window_end_et: "15:00:00",
  avoid_open_minutes: 30,
  avoid_close_minutes: 30,
  regime_filter_enabled: true,
};

let mockBrokerSettings: BrokerSettings = {
  auto_execute_enabled: false,
  auto_execute_strength: "strong_only",
  auto_execute_after_seconds: 0,
};

let mockProposal: Proposal | null = {
  id: "proposal-mock-1",
  symbol: "AAPL",
  side: "buy",
  qty: 5,
  stop_loss_pct: 0.006,
  take_profit_pct: 0.012,
  last_price_snapshot: 190.12,
  score: 82.4,
  strength: "strong",
  rationale: [
    "Momentum aligned on 5m and 15m",
    "Spread is tight and liquidity is healthy",
    "Volatility is within preferred band",
  ],
  capital_used_pct: 0.12,
  daily_risk_remaining_usd: 105,
  entry: { type: "limit", limit_price: 190.21 },
  stock_overview: {
    company_name: "Apple Inc.",
    last_price: 190.21,
    market_cap: 3_140_000_000_000,
    market_cap_segment: "Mega-cap",
    sector: "Technology",
    week52_low: 164.08,
    week52_high: 199.62,
    intraday_change_pct: 0.0084,
    sparkline: [188.4, 188.7, 189.1, 189.4, 189.0, 189.6, 190.2],
    read_more_url: "https://finance.yahoo.com/quote/AAPL",
  },
  status: "pending",
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 120_000).toISOString(),
  decision_at: null,
  ended_reason: null,
};

let mockOrders: Order[] = [];
const mockOrderOutcomes: Record<string, OrderOutcome> = {};
let brokerConnected = false;
let brokerMode: "paper" | "live" = "paper";
let cachedBrokerAccount: BrokerAccount | null = null;

function mockDelay<T>(value: T, ms = 150): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function ensureFreshProposal(): Proposal {
  const now = Date.now();
  if (!mockProposal || Date.parse(mockProposal.expires_at) <= now) {
    mockProposal = {
      id: `proposal-mock-${Math.floor(now / 1000)}`,
      symbol: "AAPL",
      side: "buy",
      qty: 5,
      stop_loss_pct: 0.006,
      take_profit_pct: 0.012,
      last_price_snapshot: 190.12,
      score: 82.4,
      strength: "strong",
      rationale: [
        "Momentum aligned on 5m and 15m",
        "Spread is tight and liquidity is healthy",
        "Volatility is within preferred band",
      ],
      capital_used_pct: 0.12,
      daily_risk_remaining_usd: 105,
      entry: { type: "limit", limit_price: 190.21 },
      stock_overview: {
        company_name: "Apple Inc.",
        last_price: 190.21,
        market_cap: 3_140_000_000_000,
        market_cap_segment: "Mega-cap",
        sector: "Technology",
        week52_low: 164.08,
        week52_high: 199.62,
        intraday_change_pct: 0.0084,
        sparkline: [188.4, 188.7, 189.1, 189.4, 189.0, 189.6, 190.2],
        read_more_url: "https://finance.yahoo.com/quote/AAPL",
      },
      status: "pending",
      created_at: new Date(now).toISOString(),
      expires_at: new Date(now + 120_000).toISOString(),
      decision_at: null,
      ended_reason: null,
    };
  }
  return mockProposal;
}

function updateMockOutcomes(): void {
  const now = Date.now();

  for (const order of mockOrders) {
    const outcome = mockOrderOutcomes[order.id];
    if (!outcome) continue;

    const ageSec = Math.max(0, Math.floor((now - Date.parse(order.submitted_at)) / 1000));

    if (ageSec >= 5 && order.avg_fill_price == null) {
      order.avg_fill_price = outcome.entry_price;
      order.filled_at = new Date(Date.parse(order.submitted_at) + 5000).toISOString();
      order.status = "filled";
    }

    if (outcome.state === "open") {
      const drift = Math.sin(ageSec / 7) * 0.004 + 0.001;
      const markPrice = Number((outcome.entry_price * (1 + drift)).toFixed(2));
      outcome.mark_price = markPrice;
      outcome.unrealized_pnl = Number(((markPrice - outcome.entry_price) * outcome.qty).toFixed(2));
      outcome.updated_at = new Date().toISOString();

      if (ageSec >= 45) {
        outcome.state = "closed";
        outcome.realized_pnl = outcome.unrealized_pnl;
        outcome.unrealized_pnl = 0;
        order.status = "done_for_day";
      }
    }
  }
}

export function toApiError(error: unknown): string {
  const axiosError = error as AxiosError<{ detail?: string; message?: string }>;
  const message = axiosError?.response?.data?.detail ?? axiosError?.response?.data?.message;
  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }
  if (axiosError?.message) {
    return axiosError.message;
  }
  return "Request failed";
}

export async function authMagicLink(email: string): Promise<{ sent: boolean }> {
  if (USE_MOCKS) {
    return mockDelay({ sent: Boolean(email.trim()) });
  }
  const res = await api.post("/auth/magic_link", { email });
  return res.data;
}

export async function authVerify(email: string, code: string): Promise<AuthSession> {
  if (USE_MOCKS) {
    if (code !== "123456") {
      throw new Error("Invalid code. Use 123456 in mock mode.");
    }
    return mockDelay({ token: "mock-token", user_id: `mock-${email || "user"}` });
  }
  const res = await api.post<AuthSession>("/auth/verify", { email, code });
  return res.data;
}

export async function authFirebase(idToken: string): Promise<FirebaseAuthResponse> {
  if (USE_MOCKS) {
    return mockDelay({
      accessToken: "mock-access-token",
      user: {
        id: "mock-google-user",
        email: "mock-google@example.com",
        name: "Mock Google User",
        picture: null,
      },
    });
  }
  const res = await api.post<FirebaseAuthResponse>("/auth/firebase", { idToken });
  return res.data;
}

export async function registerDevice(platform: Platform, fcmToken: string): Promise<{ ok: boolean }> {
  if (USE_MOCKS) {
    return mockDelay({ ok: platform.length > 0 && fcmToken.length > 0 });
  }
  const res = await api.post("/devices/register", {
    platform,
    fcm_token: fcmToken,
  });
  return res.data;
}

export async function alpacaConnect(env: "paper" | "live", apiKey: string, apiSecret: string): Promise<{ connected: boolean; account: BrokerAccount }> {
  if (USE_MOCKS) {
    brokerConnected = true;
    brokerMode = env;
    const payload = {
      connected: Boolean(env && apiKey && apiSecret),
      account: {
        id: "mock-alpaca-1",
        equity: "10000.00",
        buying_power: "20000.00",
        status: "ACTIVE",
        currency: "USD",
      },
    };
    cachedBrokerAccount = payload.account;
    return mockDelay(payload);
  }
  const res = await api.post("/broker/alpaca/connect", {
    env,
    api_key: apiKey,
    api_secret: apiSecret,
  });
  cachedBrokerAccount = res.data.account;
  brokerMode = env;
  return res.data;
}

export async function alpacaDisconnect(): Promise<{ disconnected: boolean }> {
  if (USE_MOCKS) {
    brokerConnected = false;
    brokerMode = "paper";
    cachedBrokerAccount = null;
    return mockDelay({ disconnected: true });
  }
  const res = await api.post("/broker/alpaca/disconnect");
  cachedBrokerAccount = null;
  brokerMode = "paper";
  return res.data;
}

export async function alpacaConnectWithCredentials(
  env: "paper" | "live",
  username: string,
  password: string
): Promise<{ connected: boolean; account: BrokerAccount }> {
  return alpacaConnect(env, username, password);
}

export async function getBrokerSettings(): Promise<BrokerSettings> {
  if (USE_MOCKS) {
    return mockDelay(mockBrokerSettings);
  }
  const res = await api.get<BrokerSettings>("/broker/settings");
  return res.data;
}

export async function updateBrokerSettings(payload: BrokerSettingsUpdate): Promise<BrokerSettings> {
  if (USE_MOCKS) {
    mockBrokerSettings = { ...mockBrokerSettings, ...payload };
    return mockDelay(mockBrokerSettings);
  }
  const res = await api.put<BrokerSettings>("/broker/settings", payload);
  return res.data;
}

export async function getRisk(): Promise<RiskProfile> {
  if (USE_MOCKS) {
    return mockDelay(mockRisk);
  }
  const res = await api.get<RiskProfile>("/risk");
  return res.data;
}

export async function updateRisk(payload: RiskProfileUpdate): Promise<RiskProfile> {
  if (USE_MOCKS) {
    mockRisk = { ...mockRisk, ...payload };
    return mockDelay(mockRisk);
  }
  const res = await api.put<RiskProfile>("/risk", payload);
  return res.data;
}

export async function getCurrentProposal(): Promise<Proposal | null> {
  if (USE_MOCKS) {
    if (!brokerConnected) return mockDelay(null);
    return mockDelay(ensureFreshProposal());
  }
  const res = await api.get<Proposal | null>("/proposal/current");
  return res.data;
}

export async function getProposalById(id: string): Promise<Proposal> {
  if (USE_MOCKS) {
    const proposal = ensureFreshProposal();
    if (proposal.id === id) return mockDelay(proposal);
    return mockDelay({ ...proposal, id, status: "executed", ended_reason: "auto_executed" });
  }
  const res = await api.get<Proposal>(`/proposal/${id}`);
  return res.data;
}

export async function approveProposal(id: string): Promise<ProposalDecisionResult> {
  if (USE_MOCKS) {
    const proposal = ensureFreshProposal();
    if (proposal.id !== id) {
      return mockDelay({
        proposal_id: id,
        status: "expired",
        message: "Proposal expired; no order placed",
        order: null,
      });
    }

    const entryPrice = proposal.entry.limit_price;
    const order: Order = {
      id: `order-${Date.now()}`,
      alpaca_order_id: `alpaca-${Date.now()}`,
      client_order_id: proposal.id,
      symbol: proposal.symbol,
      qty: proposal.qty,
      side: proposal.side,
      type: "limit",
      order_class: "bracket",
      status: "accepted",
      submitted_at: new Date().toISOString(),
      filled_at: null,
      avg_fill_price: null,
      take_profit_price: Number((entryPrice * (1 + proposal.take_profit_pct)).toFixed(2)),
      stop_loss_price: Number((entryPrice * (1 - proposal.stop_loss_pct)).toFixed(2)),
    };

    mockOrderOutcomes[order.id] = {
      order_id: order.id,
      symbol: order.symbol,
      qty: order.qty,
      entry_price: entryPrice,
      mark_price: entryPrice,
      entry_notional: Number((entryPrice * order.qty).toFixed(2)),
      unrealized_pnl: 0,
      realized_pnl: 0,
      state: "open",
      updated_at: new Date().toISOString(),
    };

    mockOrders = [order, ...mockOrders];
    mockProposal = null;
    return mockDelay({
      proposal_id: id,
      status: "approved",
      message: "Order submitted",
      order,
    });
  }
  const res = await api.post<ProposalDecisionResult>(`/proposal/${id}/approve`);
  return res.data;
}

export async function rejectProposal(id: string): Promise<ProposalDecisionResult> {
  if (USE_MOCKS) {
    mockProposal = null;
    return mockDelay({
      proposal_id: id,
      status: "rejected",
      message: "Proposal rejected",
      order: null,
    });
  }
  const res = await api.post<ProposalDecisionResult>(`/proposal/${id}/reject`);
  return res.data;
}

export async function getRecentOrders(): Promise<Order[]> {
  if (USE_MOCKS) {
    updateMockOutcomes();
    return mockDelay(mockOrders);
  }
  const res = await api.get<Order[]>("/orders/recent");
  return res.data;
}

export async function getBrokerAccount(): Promise<BrokerAccount | null> {
  if (USE_MOCKS) {
    return mockDelay(cachedBrokerAccount);
  }
  try {
    const res = await api.get<BrokerAccount>("/broker/alpaca/account");
    cachedBrokerAccount = res.data;
    return res.data;
  } catch {
    return cachedBrokerAccount;
  }
}

export async function getOrderOutcomes(): Promise<Record<string, OrderOutcome>> {
  if (USE_MOCKS) {
    updateMockOutcomes();
    return mockDelay({ ...mockOrderOutcomes });
  }
  const res = await api.get<Record<string, OrderOutcome>>("/orders/outcomes");
  return res.data ?? {};
}

export async function getExecutionSummary(window: "1d" | "5d" | "all" = "1d"): Promise<ExecutionSummary> {
  const res = await api.get<ExecutionSummary>(`/metrics/execution/summary?window=${window}`);
  return res.data;
}

export async function getExecutionRecent(limit = 10): Promise<ExecutionRecentResponse> {
  const res = await api.get<ExecutionRecentResponse>(`/metrics/execution/recent?limit=${limit}`);
  return res.data ?? { items: [] };
}

export async function getProposalsHistory(limit = 50, cursor?: string | null): Promise<ProposalHistoryResponse> {
  if (USE_MOCKS) {
    updateMockOutcomes();

    const items: ProposalHistoryItem[] = [];

    if (mockProposal) {
      items.push({
        id: mockProposal.id,
        created_at: mockProposal.created_at,
        status: mockProposal.status,
        symbol: mockProposal.symbol,
        side: mockProposal.side,
        qty: mockProposal.qty,
        strength: mockProposal.strength,
        expires_at: mockProposal.expires_at,
        decision_at: mockProposal.decision_at ?? null,
        rationale: mockProposal.rationale.slice(0, 3),
        risk: {
          max_loss_usd: Number((mockProposal.qty * mockProposal.entry.limit_price * mockProposal.stop_loss_pct).toFixed(2)),
          target_usd: Number((mockProposal.qty * mockProposal.entry.limit_price * mockProposal.take_profit_pct).toFixed(2)),
        },
        prices: {
          entry_limit_price: mockProposal.entry.limit_price,
          stop_loss_price: Number((mockProposal.entry.limit_price * (1 - mockProposal.stop_loss_pct)).toFixed(2)),
          take_profit_price: Number((mockProposal.entry.limit_price * (1 + mockProposal.take_profit_pct)).toFixed(2)),
          filled_avg_price: null,
          filled_at: null,
        },
        stock_overview: mockProposal.stock_overview ?? null,
        reason: null,
      });
    }

    for (const order of mockOrders) {
      const outcome = mockOrderOutcomes[order.id];
      const status = order.status === "done_for_day" || order.status === "filled" ? "executed" : "approved";
      items.push({
        id: order.client_order_id,
        created_at: order.submitted_at,
        status,
        symbol: order.symbol,
        side: order.side,
        qty: order.qty,
        strength: "strong",
        expires_at: order.submitted_at,
        decision_at: order.submitted_at,
        rationale: [],
        risk: {
          max_loss_usd: Number((order.qty * Math.max((order.avg_fill_price ?? order.take_profit_price) - order.stop_loss_price, 0)).toFixed(2)),
          target_usd: Number((order.qty * Math.max(order.take_profit_price - (order.avg_fill_price ?? order.stop_loss_price), 0)).toFixed(2)),
        },
        prices: {
          entry_limit_price: order.avg_fill_price,
          stop_loss_price: order.stop_loss_price,
          take_profit_price: order.take_profit_price,
          filled_avg_price: order.avg_fill_price,
          filled_at: order.filled_at,
        },
        order_summary: {
          alpaca_order_id: order.alpaca_order_id,
          status: order.status,
          submitted_at: order.submitted_at,
          filled_at: order.filled_at,
          avg_fill_price: order.avg_fill_price,
        },
      });
      if (outcome && outcome.state === "closed") {
        // keep entry available through order_summary/prices
      }
    }

    items.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    const start = cursor ? Number(cursor) || 0 : 0;
    const end = start + limit;
    return mockDelay({
      items: items.slice(start, end),
      next_cursor: end < items.length ? String(end) : null,
    });
  }

  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);
  const res = await api.get<ProposalHistoryResponse>(`/proposals/history?${params.toString()}`);
  return res.data;
}


export async function getBrokerStatus(): Promise<BrokerStatus> {
  if (USE_MOCKS) {
    return mockDelay({ connected: brokerConnected, mode: brokerConnected ? brokerMode : null });
  }
  const res = await api.get<BrokerStatus>("/broker/status");
  return res.data;
}

export async function activateSystem(mode: "paper" | "live", settingsSnapshot: Record<string, unknown>): Promise<{ ok: boolean }> {
  if (USE_MOCKS) {
    return mockDelay({ ok: true });
  }

  try {
    const res = await api.post<{ ok: boolean }>("/system/activate", { mode, settings_snapshot: settingsSnapshot });
    return res.data;
  } catch {
    return { ok: true };
  }
}

export default api;
