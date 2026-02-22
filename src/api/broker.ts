import api from "@/api/client";

type BrokerMode = "paper" | "live";

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

function normalizeConnection(input: unknown): ConnectionNode {
  const value = (input ?? {}) as Partial<ConnectionNode>;
  return {
    connected: Boolean(value.connected),
    connectedAt: value.connectedAt ?? null,
    accountId: value.accountId ?? null,
    lastError: value.lastError ?? null,
  };
}

export async function getBrokerStatus(): Promise<BrokerStatusResponse> {
  const res = await api.get<unknown>("/broker/status");
  const payload = (res.data ?? {}) as {
    alpaca?: { paper?: Partial<ConnectionNode>; live?: Partial<ConnectionNode> };
    connected?: boolean;
    mode?: BrokerMode | null;
  };

  if (payload.alpaca) {
    return {
      alpaca: {
        paper: normalizeConnection(payload.alpaca.paper),
        live: normalizeConnection(payload.alpaca.live),
      },
    };
  }

  // Backward-compatible fallback for legacy shape: { connected, mode }
  const mode = payload.mode === "live" ? "live" : "paper";
  const connected = Boolean(payload.connected);
  return {
    alpaca: {
      paper: mode === "paper" ? { ...EMPTY_CONNECTION, connected } : EMPTY_CONNECTION,
      live: mode === "live" ? { ...EMPTY_CONNECTION, connected } : EMPTY_CONNECTION,
    },
  };
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
