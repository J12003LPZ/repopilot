import { describe, it, expect } from "vitest";
import { computeActivityMetrics } from "@/lib/scanners/activityScanner";

const NOW = new Date("2026-06-01T00:00:00Z");

function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * 86400000).toISOString();
}

describe("computeActivityMetrics", () => {
  it("computes commit windows and last-commit recency", () => {
    const result = computeActivityMetrics({
      now: NOW,
      commits: [daysAgo(1), daysAgo(10), daysAgo(40), daysAgo(100)],
      issues: [],
      pullRequests: [],
      contributorCount: 3,
    });
    expect(result.metrics.commits30d).toBe(2);
    expect(result.metrics.commits90d).toBe(3);
    expect(result.metrics.daysSinceLastCommit).toBe(1);
    expect(result.metrics.contributorCount).toBe(3);
  });

  it("computes average and oldest issue/PR ages and stale counts", () => {
    const result = computeActivityMetrics({
      now: NOW,
      commits: [daysAgo(1)],
      issues: [{ createdAt: daysAgo(10) }, { createdAt: daysAgo(50) }],
      pullRequests: [
        { createdAt: daysAgo(20), updatedAt: daysAgo(20) },
        { createdAt: daysAgo(5), updatedAt: daysAgo(1) },
      ],
      contributorCount: 1,
    });
    expect(result.metrics.openIssues).toBe(2);
    expect(result.metrics.openPrs).toBe(2);
    expect(result.metrics.oldestIssueDays).toBe(50);
    expect(result.metrics.avgPrAgeDays).toBeCloseTo(12.5, 1);
    expect(result.metrics.stalePrs).toBe(1); // the 20-day-old, not updated recently
  });

  it("emits a PR bottleneck finding when avg PR age is high", () => {
    const result = computeActivityMetrics({
      now: NOW,
      commits: [daysAgo(1)],
      issues: [],
      pullRequests: [
        { createdAt: daysAgo(30), updatedAt: daysAgo(30) },
        { createdAt: daysAgo(40), updatedAt: daysAgo(40) },
      ],
      contributorCount: 1,
    });
    expect(result.findings.some((f) => f.title.toLowerCase().includes("pull request"))).toBe(true);
  });

  it("emits an inactivity finding when last commit is very old", () => {
    const result = computeActivityMetrics({
      now: NOW,
      commits: [daysAgo(200)],
      issues: [],
      pullRequests: [],
      contributorCount: 1,
    });
    expect(result.findings.some((f) => f.category === "activity")).toBe(true);
  });
});
