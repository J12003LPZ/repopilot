export const HOURLY_SCAN_LIMIT = 5;
export const ACTIVE_SCAN_LIMIT = 1;

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: "hourly_limit" | "active_limit" };

export function evaluateRateLimit(input: {
  recentScanCount: number;
  activeScanCount: number;
  hourlyLimit?: number;
  activeLimit?: number;
}): RateLimitResult {
  const hourlyLimit = input.hourlyLimit ?? HOURLY_SCAN_LIMIT;
  const activeLimit = input.activeLimit ?? ACTIVE_SCAN_LIMIT;

  if (input.activeScanCount >= activeLimit) {
    return { allowed: false, reason: "active_limit" };
  }
  if (input.recentScanCount >= hourlyLimit) {
    return { allowed: false, reason: "hourly_limit" };
  }
  return { allowed: true };
}
