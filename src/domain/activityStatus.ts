export const ProposalStatuses = {
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
  TRIGGERED: "TRIGGERED",
  ENTRY_FILLED: "ENTRY_FILLED",
} as const;

export type ProposalStatus = (typeof ProposalStatuses)[keyof typeof ProposalStatuses];

export const OrderStatuses = {
  NEW: "NEW",
  PENDING: "PENDING",
  PARTIALLY_FILLED: "PARTIALLY_FILLED",
  FILLED: "FILLED",
  CANCELLED: "CANCELLED",
  REJECTED: "REJECTED",
} as const;

export type OrderStatus = (typeof OrderStatuses)[keyof typeof OrderStatuses];

export const TradeStatuses = {
  OPEN: "OPEN",
  CLOSING: "CLOSING",
  CLOSED_TP: "CLOSED_TP",
  CLOSED_SL: "CLOSED_SL",
  CLOSED_MANUAL: "CLOSED_MANUAL",
  CLOSED_UNKNOWN: "CLOSED_UNKNOWN",
} as const;

export type TradeStatus = (typeof TradeStatuses)[keyof typeof TradeStatuses];
