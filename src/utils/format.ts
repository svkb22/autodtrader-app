export function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function usd(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function dateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
