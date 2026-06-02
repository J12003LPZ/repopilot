import { describe, it, expect } from "vitest";
import { evaluateRateLimit } from "@/lib/utils/rateLimit";

describe("evaluateRateLimit", () => {
  it("allows when under the hourly limit and no active scan", () => {
    const result = evaluateRateLimit({
      recentScanCount: 2,
      activeScanCount: 0,
      hourlyLimit: 5,
      activeLimit: 1,
    });
    expect(result.allowed).toBe(true);
  });

  it("blocks when hourly limit reached", () => {
    const result = evaluateRateLimit({
      recentScanCount: 5,
      activeScanCount: 0,
      hourlyLimit: 5,
      activeLimit: 1,
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toBe("hourly_limit");
  });

  it("blocks when an active scan is already running", () => {
    const result = evaluateRateLimit({
      recentScanCount: 1,
      activeScanCount: 1,
      hourlyLimit: 5,
      activeLimit: 1,
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toBe("active_limit");
  });
});
