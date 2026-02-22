import api, { getOrderOutcomes, getProposalsHistory } from "@/api/client";
import { ActivityItem, ActivityRange, ActivityResponse, ActivityStatus, ProposalHistoryItem } from "@/api/types";

type ActivityParams = {
  status?: ActivityStatus | "all";
  range?: ActivityRange;
  limit?: number;
  cursor?: string | null;
};

function mapReason(item: ProposalHistoryItem): string | undefined {
  if (item.status === "expired") return "Approval window ended";
  if (item.status === "rejected") return "You declined";
  if (item.status === "blocked") {
    const lower = (item.reason ?? "").toLowerCase();
    if (lower.includes("daily loss")) return "Daily loss cap reached";
    if (lower.includes("kill_switch") || lower.includes("paused")) return "System paused";
    if (lower.includes("max trades")) return "Max trades reached";
    return item.reason ?? "Blocked by safeguards";
  }
  return item.reason ?? undefined;
}

function withinRange(iso: string, range: ActivityRange): boolean {
  if (range === "all") return true;
  const now = Date.now();
  const created = Date.parse(iso);
  if (!Number.isFinite(created)) return false;
  const days = range === "1w" ? 7 : 30;
  return created >= now - days * 24 * 60 * 60 * 1000;
}

function mapHistoryToActivity(
  historyItems: ProposalHistoryItem[],
  outcomes: Record<string, { realized_pnl: number; unrealized_pnl: number }>,
  range: ActivityRange,
  status?: ActivityStatus | "all"
): ActivityItem[] {
  const mapped: ActivityItem[] = historyItems
    .filter((item) => item.status !== "pending")
    .map((item) => {
      const outcome = outcomes[item.id];
      const normalizedStatus: ActivityStatus = item.status === "approved" ? "executed" : (item.status as ActivityStatus);
      const normalizedSide: "long" | "short" = item.side.toLowerCase() === "sell" ? "short" : "long";
      const approvedMode: "manual" | "auto" = item.reason?.toLowerCase().includes("auto") ? "auto" : "manual";
      return {
        id: item.id,
        symbol: item.symbol,
        side: normalizedSide,
        status: normalizedStatus,
        reason: mapReason(item),
        created_at: item.created_at,
        decided_at: item.decision_at ?? undefined,
        expires_at: item.expires_at ?? undefined,
        risk_used_usd: item.risk.max_loss_usd,
        pnl_total: outcome ? outcome.realized_pnl + outcome.unrealized_pnl : undefined,
        approved_mode: approvedMode,
        blocked_reason: item.status === "blocked" ? item.reason ?? undefined : undefined,
        rejected_by: item.status === "rejected" ? "user" : undefined,
        entry_price: item.prices.entry_limit_price,
        stop_loss_price: item.prices.stop_loss_price,
        take_profit_price: item.prices.take_profit_price,
        filled_avg_price: item.prices.filled_avg_price,
        filled_at: item.prices.filled_at,
        order_status: item.order_summary?.status ?? null,
        rationale: item.rationale,
      };
    })
    .filter((item) => withinRange(item.created_at, range))
    .filter((item) => (status && status !== "all" ? item.status === status : true));

  mapped.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return mapped;
}

export async function getActivity(params: ActivityParams = {}): Promise<ActivityResponse> {
  const status = params.status;
  const range = params.range ?? "1w";
  const limit = params.limit ?? 20;
  const cursor = params.cursor ?? null;

  try {
    const query = new URLSearchParams();
    if (status && status !== "all") query.set("status", status);
    query.set("range", range);
    query.set("limit", String(limit));
    if (cursor) query.set("cursor", cursor);

    const res = await api.get<ActivityResponse>(`/activity?${query.toString()}`);
    return {
      items: res.data.items ?? [],
      next_cursor: res.data.next_cursor ?? null,
    };
  } catch {
    const [history, outcomes] = await Promise.all([getProposalsHistory(200, null), getOrderOutcomes()]);
    const items = mapHistoryToActivity(history.items, outcomes, range, status);
    const start = cursor ? Number(cursor) || 0 : 0;
    const end = Math.min(start + limit, items.length);
    return {
      items: items.slice(start, end),
      next_cursor: end < items.length ? String(end) : null,
    };
  }
}
