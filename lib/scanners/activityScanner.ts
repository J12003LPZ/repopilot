import type { Finding } from "@/lib/types";
import { getActivityStatus } from "@/lib/scanners/scoring";

const DAY = 86400000;
const STALE_DAYS = 14;

export type IssueInput = { createdAt: string };
export type PrInput = { createdAt: string; updatedAt: string };

export type ActivityMetrics = {
  commits30d: number;
  commits90d: number;
  daysSinceLastCommit: number;
  openIssues: number;
  openPrs: number;
  staleIssues: number;
  stalePrs: number;
  avgIssueAgeDays: number;
  avgPrAgeDays: number;
  oldestIssueDays: number;
  oldestPrDays: number;
  contributorCount: number;
  status: string;
};

export type ActivityScanResult = {
  metrics: ActivityMetrics;
  findings: Finding[];
};

function ageDays(now: Date, iso: string): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / DAY);
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function computeActivityMetrics(input: {
  now: Date;
  commits: string[];
  issues: IssueInput[];
  pullRequests: PrInput[];
  contributorCount: number;
}): ActivityScanResult {
  const { now, commits, issues, pullRequests, contributorCount } = input;

  const commitAges = commits.map((c) => ageDays(now, c));
  const commits30d = commitAges.filter((d) => d <= 30).length;
  const commits90d = commitAges.filter((d) => d <= 90).length;
  const daysSinceLastCommit =
    commitAges.length > 0 ? Math.min(...commitAges) : Number.MAX_SAFE_INTEGER;

  const issueAges = issues.map((i) => ageDays(now, i.createdAt));
  const prAges = pullRequests.map((p) => ageDays(now, p.createdAt));
  const stalePrs = pullRequests.filter(
    (p) => ageDays(now, p.updatedAt) > STALE_DAYS
  ).length;
  const staleIssues = issueAges.filter((d) => d > 60).length;

  const metrics: ActivityMetrics = {
    commits30d,
    commits90d,
    daysSinceLastCommit:
      daysSinceLastCommit === Number.MAX_SAFE_INTEGER ? 9999 : daysSinceLastCommit,
    openIssues: issues.length,
    openPrs: pullRequests.length,
    staleIssues,
    stalePrs,
    avgIssueAgeDays: Math.round(avg(issueAges) * 10) / 10,
    avgPrAgeDays: Math.round(avg(prAges) * 10) / 10,
    oldestIssueDays: issueAges.length ? Math.max(...issueAges) : 0,
    oldestPrDays: prAges.length ? Math.max(...prAges) : 0,
    contributorCount,
    status: getActivityStatus(
      daysSinceLastCommit === Number.MAX_SAFE_INTEGER ? 9999 : daysSinceLastCommit
    ),
  };

  const findings: Finding[] = [];

  if (metrics.daysSinceLastCommit > 90) {
    findings.push({
      category: "activity",
      severity: metrics.daysSinceLastCommit > 365 ? "high" : "medium",
      title: "Repository looks inactive",
      description: `The last commit was ${metrics.daysSinceLastCommit} days ago.`,
      recommendation:
        "If the project is maintained, resume regular commits; otherwise mark it as archived.",
    });
  }

  if (metrics.openPrs > 0 && metrics.avgPrAgeDays >= 14) {
    findings.push({
      category: "maintainability",
      severity: "medium",
      title: "Pull request review bottleneck",
      description: `There are ${metrics.openPrs} open pull requests with an average age of ${metrics.avgPrAgeDays} days.`,
      recommendation:
        "Review and merge or close stale PRs; consider review SLAs and CODEOWNERS.",
    });
  }

  if (metrics.staleIssues > 0) {
    findings.push({
      category: "maintainability",
      severity: "low",
      title: "Stale open issues",
      description: `${metrics.staleIssues} issue(s) have been open for over 60 days.`,
      recommendation: "Triage stale issues: label, close, or schedule them.",
    });
  }

  return { metrics, findings };
}
