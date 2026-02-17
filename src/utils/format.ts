export function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function usd(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function usdCompact(value: number): string {
  if (!Number.isFinite(value)) return "-";
  const formatted = Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
  return formatted.replace(".0", "");
}

export function signedPct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(2)}%`;
}

export function dateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
