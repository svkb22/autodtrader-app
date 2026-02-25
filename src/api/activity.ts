import api, { getExecutionRecent, getOrderOutcomes, getProposalsHistory, getRecentOrders } from "@/api/client";
import { ActivityItem, ActivityRange, ActivityResponse, ActivityStatus, ExecutionRecentItem, Order, ProposalHistoryItem } from "@/api/types";

type ActivityParams = {
  status?: ActivityStatus | "all";
  range?: ActivityRange;
  limit?: number;
  cursor?: string | null;
};

function mapReason(item: ProposalHistoryItem): string | undefined {
  if (item.status === "expired") return "Approval window ended";
  if (item.status === "rejected") return "You declined";
  if (item.status === "shadow") return "Shadow proposal (non-actionable)";
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
  recentOrders: Order[],
  execRecent: ExecutionRecentItem[],
  range: ActivityRange,
  status?: ActivityStatus | "all"
): ActivityItem[] {
  const orderByProposalId = new Map<string, Order>();
  const orderByAlpacaId = new Map<string, Order>();
  for (const order of recentOrders) {
    if (order.client_order_id) orderByProposalId.set(order.client_order_id, order);
    if (order.alpaca_order_id) orderByAlpacaId.set(order.alpaca_order_id, order);
  }
  const execByProposalId = new Map<string, ExecutionRecentItem>();
  const execByOrderId = new Map<string, ExecutionRecentItem>();
  for (const x of execRecent) {
    execByOrderId.set(x.order_id, x);
    if (x.proposal_id) execByProposalId.set(x.proposal_id, x);
  }

  const mapped: ActivityItem[] = historyItems
    .filter((item) => item.status !== "pending")
    .map((item) => {
      const matchedOrder =
        orderByProposalId.get(item.id) ??
        (item.order_summary?.alpaca_order_id ? orderByAlpacaId.get(item.order_summary.alpaca_order_id) : undefined);
      const exec =
        execByProposalId.get(item.id) ??
        (matchedOrder?.alpaca_order_id ? execByOrderId.get(matchedOrder.alpaca_order_id) : undefined);
      const outcome = matchedOrder ? outcomes[matchedOrder.id] : undefined;
      const normalizedStatus: ActivityStatus =
        item.status === "approved" ? "executed" : (item.status as ActivityStatus);
      const normalizedSide: "long" | "short" = item.side.toLowerCase() === "sell" ? "short" : "long";
      const approvedMode: "manual" | "auto" =
        item.reason?.toLowerCase().includes("auto") ? "auto" : "manual";
      const realizedPnl = exec?.realized_pnl ?? undefined;
      const unrealizedPnl = outcome ? outcome.unrealized_pnl : undefined;
      const combinedPnl = realizedPnl ?? (outcome ? outcome.realized_pnl + outcome.unrealized_pnl : undefined);
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
        pnl_total: combinedPnl,
        realized_pnl: realizedPnl,
        unrealized_pnl: unrealizedPnl,
        approved_mode: normalizedStatus === "shadow" ? undefined : approvedMode,
        blocked_reason: item.status === "blocked" ? item.reason ?? undefined : undefined,
        rejected_by: item.status === "rejected" ? "user" : undefined,
        entry_price: exec?.actual_fill ?? item.prices.entry_limit_price,
        stop_loss_price: item.prices.stop_loss_price,
        take_profit_price: item.prices.take_profit_price,
        filled_avg_price: exec?.actual_fill ?? item.prices.filled_avg_price,
        exit_fill_price: exec?.actual_exit_fill ?? null,
        filled_at: exec?.filled_at ?? item.prices.filled_at,
        order_status: exec?.status ?? item.order_summary?.status ?? null,
        execution_order_id: exec?.order_id ?? matchedOrder?.alpaca_order_id ?? null,
        rationale: item.rationale,
        stock_overview: item.stock_overview ?? null,
      };
    })
    .filter((item) => withinRange(item.created_at, range))
    .filter((item) => (status && status !== "all" ? item.status === status : true));

  mapped.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return mapped;
}

function mapOrphanOrdersToActivity(
  orders: Order[],
  outcomes: Record<string, { realized_pnl: number; unrealized_pnl: number }>,
  execRecent: ExecutionRecentItem[],
  knownProposalIds: Set<string>,
  range: ActivityRange,
  status?: ActivityStatus | "all"
): ActivityItem[] {
  if (status && status !== "all" && status !== "executed") return [];
  const execByOrderId = new Map<string, ExecutionRecentItem>();
  for (const x of execRecent) execByOrderId.set(x.order_id, x);
  return orders
    .filter((order) => !knownProposalIds.has(order.client_order_id))
    .map((order): ActivityItem => {
      const outcome = outcomes[order.id];
      const exec = order.alpaca_order_id ? execByOrderId.get(order.alpaca_order_id) : undefined;
      const realizedPnl = exec?.realized_pnl ?? undefined;
      return {
        id: order.client_order_id,
        symbol: order.symbol,
        side: (order.side.toLowerCase() === "sell" ? "short" : "long") as "long" | "short",
        status: "executed" as const,
        reason: "Order detected; proposal history unavailable",
        created_at: order.submitted_at,
        decided_at: order.submitted_at,
        risk_used_usd: undefined,
        pnl_total: realizedPnl ?? (outcome ? outcome.realized_pnl + outcome.unrealized_pnl : undefined),
        realized_pnl: realizedPnl,
        unrealized_pnl: outcome?.unrealized_pnl,
        approved_mode: undefined,
        entry_price: exec?.actual_fill ?? order.avg_fill_price ?? null,
        stop_loss_price: order.stop_loss_price,
        take_profit_price: order.take_profit_price,
        filled_avg_price: exec?.actual_fill ?? order.avg_fill_price,
        exit_fill_price: exec?.actual_exit_fill ?? null,
        filled_at: order.filled_at,
        order_status: exec?.status ?? order.status,
        execution_order_id: exec?.order_id ?? order.alpaca_order_id,
        rationale: [],
        stock_overview: null,
      };
    })
    .filter((item) => withinRange(item.created_at, range));
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
    const [history, outcomes, recentOrders, execRecentRes] = await Promise.all([
      getProposalsHistory(200, null),
      getOrderOutcomes(),
      getRecentOrders(),
      getExecutionRecent(200).catch(() => ({ items: [] })),
    ]);
    const execRecent = execRecentRes.items ?? [];
    const historyItems = mapHistoryToActivity(history.items, outcomes, recentOrders, execRecent, range, status);
    const knownProposalIds = new Set(history.items.map((item) => item.id));
    const orphanOrderItems = mapOrphanOrdersToActivity(recentOrders, outcomes, execRecent, knownProposalIds, range, status);
    const items = [...historyItems, ...orphanOrderItems].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    const start = cursor ? Number(cursor) || 0 : 0;
    const end = Math.min(start + limit, items.length);
    return {
      items: items.slice(start, end),
      next_cursor: end < items.length ? String(end) : null,
    };
  }
}
