import api from "@/api/client";

type BrokerMode = "paper" | "live";
export type ManualConnectPayload = {
  env: BrokerMode;
  api_key: string;
  api_secret: string;
};

type ConnectionNode = {
  connected: boolean;
  connectedAt: string | null;
  accountId: string | null;
  lastError: string | null;
};

export type BrokerConnectionStatus = {
  broker: "alpaca";
  mode: BrokerMode;
  connected: boolean;
  connectedAt: string | null;
  accountId: string | null;
  lastError: string | null;
};

export type BrokerStatusResponse = {
  alpaca: {
    paper: ConnectionNode;
    live: ConnectionNode;
  };
};

const EMPTY_CONNECTION: ConnectionNode = {
  connected: false,
  connectedAt: null,
  accountId: null,
  lastError: null,
};
const BROKER_STATUS_CACHE_TTL_MS = 3000;
let brokerStatusCache: { value: BrokerStatusResponse; ts: number } | null = null;
let brokerStatusInFlight: Promise<BrokerStatusResponse> | null = null;

function normalizeConnection(input: unknown): ConnectionNode {
  const value = (input ?? {}) as Partial<ConnectionNode> & {
    connected_at?: string | null;
    account_id?: string | null;
    last_error?: string | null;
  };
  const accountId = value.accountId ?? value.account_id ?? null;
  const connectedAt = value.connectedAt ?? value.connected_at ?? null;
  const rawConnected = Boolean(value.connected);
  // Guard against stale backend flags like connected=true with no account identity.
  const connected = rawConnected && Boolean(accountId || connectedAt);
  return {
    connected,
    connectedAt,
    accountId,
    lastError: value.lastError ?? value.last_error ?? null,
  };
}

export async function getBrokerStatus(force = false): Promise<BrokerStatusResponse> {
  const now = Date.now();
  if (force) {
    brokerStatusCache = null;
  }
  if (!force && brokerStatusCache && now - brokerStatusCache.ts < BROKER_STATUS_CACHE_TTL_MS) {
    return brokerStatusCache.value;
  }
  if (!force && brokerStatusInFlight) {
    return brokerStatusInFlight;
  }

  brokerStatusInFlight = api
    .get<unknown>("/broker/status")
    .then((res) => {
      const payload = (res.data ?? {}) as {
        alpaca?: { paper?: Partial<ConnectionNode>; live?: Partial<ConnectionNode> };
        connected?: boolean;
        mode?: BrokerMode | null;
      };

      let normalized: BrokerStatusResponse;
      if (payload.alpaca) {
        normalized = {
          alpaca: {
            paper: normalizeConnection(payload.alpaca.paper),
            live: normalizeConnection(payload.alpaca.live),
          },
        };
      } else {
        // Backward-compatible fallback for legacy shape: { connected, mode }
        const mode = payload.mode === "live" ? "live" : "paper";
        const connected = Boolean(payload.connected);
        normalized = {
          alpaca: {
            paper: mode === "paper" ? { ...EMPTY_CONNECTION, connected } : EMPTY_CONNECTION,
            live: mode === "live" ? { ...EMPTY_CONNECTION, connected } : EMPTY_CONNECTION,
          },
        };
      }

      brokerStatusCache = { value: normalized, ts: Date.now() };
      return normalized;
    })
    .finally(() => {
      brokerStatusInFlight = null;
    });

  return brokerStatusInFlight;
}

export async function connectAlpacaManual(payload: ManualConnectPayload): Promise<{ connected: boolean; accountId?: string | null }> {
  const res = await api.post<{ connected: boolean; accountId?: string | null }>("/broker/alpaca/connect", payload);
  return res.data;
}

export async function startAlpacaOAuth(mode: BrokerMode, redirectUri: string): Promise<{ authorizeUrl: string; state: string }> {
  const res = await api.post<{ authorizeUrl: string; state: string }>("/broker/alpaca/oauth/start", {
    mode,
    redirectUri,
  });
  return res.data;
}

export async function finishAlpacaOAuth(code: string, state: string, mode: BrokerMode): Promise<{ connected: boolean; accountId: string | null }> {
  const res = await api.post<{ connected: boolean; accountId: string | null }>("/broker/alpaca/oauth/callback", {
    code,
    state,
    mode,
  });
  return res.data;
}
