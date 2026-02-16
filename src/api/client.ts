import axios, { AxiosError } from "axios";

import {
  AuthSession,
  BrokerAccount,
  Order,
  Platform,
  Proposal,
  ProposalDecisionResult,
  RiskProfile,
  RiskProfileUpdate,
} from "@/api/types";

function getBaseUrl(): string {
  const value = process.env.EXPO_PUBLIC_API_URL;
  if (!value) {
    throw new Error("Missing EXPO_PUBLIC_API_URL");
  }
  return value;
}

let tokenGetter: (() => string | null) | null = null;

export function setTokenGetter(getter: () => string | null): void {
  tokenGetter = getter;
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
  const res = await api.post("/auth/magic_link", { email });
  return res.data;
}

export async function authVerify(email: string, code: string): Promise<AuthSession> {
  const res = await api.post<AuthSession>("/auth/verify", { email, code });
  return res.data;
}

export async function registerDevice(platform: Platform, fcmToken: string): Promise<{ ok: boolean }> {
  const res = await api.post("/devices/register", {
    platform,
    fcm_token: fcmToken,
  });
  return res.data;
}

export async function alpacaConnect(env: "paper" | "live", apiKey: string, apiSecret: string): Promise<{ connected: boolean; account: BrokerAccount }> {
  const res = await api.post("/broker/alpaca/connect", {
    env,
    api_key: apiKey,
    api_secret: apiSecret,
  });
  return res.data;
}

export async function alpacaDisconnect(): Promise<{ disconnected: boolean }> {
  const res = await api.post("/broker/alpaca/disconnect");
  return res.data;
}

export async function getRisk(): Promise<RiskProfile> {
  const res = await api.get<RiskProfile>("/risk");
  return res.data;
}

export async function updateRisk(payload: RiskProfileUpdate): Promise<RiskProfile> {
  const res = await api.put<RiskProfile>("/risk", payload);
  return res.data;
}

export async function getCurrentProposal(): Promise<Proposal | null> {
  const res = await api.get<Proposal | null>("/proposal/current");
  return res.data;
}

export async function approveProposal(id: string): Promise<ProposalDecisionResult> {
  const res = await api.post<ProposalDecisionResult>(`/proposal/${id}/approve`);
  return res.data;
}

export async function rejectProposal(id: string): Promise<ProposalDecisionResult> {
  const res = await api.post<ProposalDecisionResult>(`/proposal/${id}/reject`);
  return res.data;
}

export async function getRecentOrders(): Promise<Order[]> {
  const res = await api.get<Order[]>("/orders/recent");
  return res.data;
}

export default api;
