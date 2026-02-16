export function getRemainingMs(expiresAtISO: string): number {
  return Date.parse(expiresAtISO) - Date.now();
}

export function isExpired(expiresAtISO: string): boolean {
  return getRemainingMs(expiresAtISO) <= 0;
}

export function formatRemaining(remainingMs: number): string {
  if (remainingMs <= 0) {
    return "Expired";
  }
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}
