import { ActivityItem, Proposal } from "@/api/types";

export type ActivityKind = "TRADE" | "PROPOSAL";

export type UnifiedActivityItem = {
  id: string;
  kind: ActivityKind;
  symbol: string;
  side: "long" | "short";
  createdAt: string;
  statusLabel: string;
  statusTone: "green" | "slate" | "amber" | "blue";
  summary: string;
  pnlValue?: number | null;
  riskUsedUsd?: number;
  entryPrice?: number | null;
  exitPrice?: number | null;
  reason?: string;
  raw: ActivityItem | Proposal;
};

function tradeSummary(item: ActivityItem): { summary: string; pnlValue?: number | null } {
  const isOpen = item.status === "open" || (item.status === "executed" && !item.exit_fill_price && item.realized_pnl == null);
  if (isOpen) {
    if (typeof item.unrealized_pnl === "number") {
      return { summary: "Entry Filled • Position Open", pnlValue: item.unrealized_pnl };
    }
    return { summary: "Entry Filled • Position Open" };
  }

  if (typeof item.realized_pnl === "number") {
    return { summary: "Position Closed", pnlValue: item.realized_pnl };
  }
  if (typeof item.pnl_total === "number") {
    return { summary: "Position Closed", pnlValue: item.pnl_total };
  }
  return { summary: "Position Closed" };
}

export function toUnifiedFromActivity(item: ActivityItem): UnifiedActivityItem {
  const kind: ActivityKind = item.status === "open" || item.status === "executed" ? "TRADE" : "PROPOSAL";

  if (kind === "TRADE") {
    const details = tradeSummary(item);
    const isOpen = details.summary.includes("Position Open");
    return {
      id: item.id,
      kind,
      symbol: item.symbol,
      side: item.side,
      createdAt: item.created_at,
      statusLabel: isOpen ? "Open Position" : "Closed Position",
      statusTone: isOpen ? "blue" : "green",
      summary: details.summary,
      pnlValue: details.pnlValue,
      riskUsedUsd: item.risk_used_usd,
      entryPrice: item.filled_avg_price ?? item.entry_price ?? null,
      exitPrice: item.exit_fill_price ?? null,
      reason: item.reason,
      raw: item,
    };
  }

  const statusLabel =
    item.status === "rejected"
      ? "Rejected"
      : item.status === "expired"
      ? "Expired"
      : item.status === "blocked"
      ? "Blocked"
      : item.status === "shadow"
      ? "Shadow"
      : "Pending";
  const statusTone: UnifiedActivityItem["statusTone"] =
    item.status === "rejected"
      ? "amber"
      : item.status === "blocked"
      ? "blue"
      : item.status === "expired"
      ? "slate"
      : item.status === "shadow"
      ? "slate"
      : "green";

  return {
    id: item.id,
    kind,
    symbol: item.symbol,
    side: item.side,
    createdAt: item.created_at,
    statusLabel,
    statusTone,
    summary: item.reason ?? statusLabel,
    riskUsedUsd: item.risk_used_usd,
    entryPrice: item.entry_price ?? null,
    exitPrice: item.exit_fill_price ?? null,
    reason: item.reason,
    raw: item,
  };
}

export function toUnifiedFromPendingProposal(proposal: Proposal): UnifiedActivityItem {
  return {
    id: proposal.id,
    kind: "PROPOSAL",
    symbol: proposal.symbol,
    side: proposal.side.toLowerCase() === "sell" ? "short" : "long",
    createdAt: proposal.created_at,
    statusLabel: "Pending",
    statusTone: "green",
    summary: "Awaiting approval",
    riskUsedUsd: proposal.qty * proposal.entry.limit_price * proposal.stop_loss_pct,
    entryPrice: proposal.entry.limit_price,
    reason: undefined,
    raw: proposal,
  };
}
