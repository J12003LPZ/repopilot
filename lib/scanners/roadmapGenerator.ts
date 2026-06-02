import type { Finding, Roadmap, Scores, Severity } from "@/lib/types";

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

export function generateTemplateRoadmap(input: {
  repoName: string;
  scores: Scores;
  findings: Finding[];
}): Roadmap {
  const { repoName, scores, findings } = input;

  const sorted = [...findings].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
  );

  const topRisks = sorted
    .filter((f) => f.severity === "critical" || f.severity === "high")
    .slice(0, 5);

  const quickWins = sorted
    .filter((f) => f.severity === "low" || f.severity === "medium")
    .slice(0, 5);

  const executiveSummary = buildSummary(repoName, scores, topRisks.length);
  const longTermPlan = buildLongTermPlan(scores);
  const firstPullRequest = suggestFirstPR(topRisks, quickWins);
  const estimatedImpact = buildImpact(topRisks.length, quickWins.length);

  return {
    executiveSummary,
    topRisks,
    quickWins,
    longTermPlan,
    firstPullRequest,
    estimatedImpact,
  };
}

function buildSummary(repoName: string, scores: Scores, riskCount: number): string {
  const health =
    scores.overall >= 80 ? "strong" : scores.overall >= 60 ? "moderate" : "at-risk";
  const riskClause =
    riskCount === 0
      ? "No critical or high-severity risks were detected."
      : `${riskCount} high-priority risk${riskCount === 1 ? "" : "s"} need attention.`;
  return `${repoName} has an overall health score of ${scores.overall}/100 (${health}). Activity ${scores.activity}, quality ${scores.quality}, security ${scores.security}. ${riskClause}`;
}

function buildLongTermPlan(scores: Scores): string[] {
  const plan: string[] = [];
  if (scores.quality < 80)
    plan.push("Raise code-quality baseline: add CI, linting, type checks, and tests.");
  if (scores.security < 80)
    plan.push("Harden security: add a lockfile, SECURITY.md, and dependency scanning.");
  if (scores.activity < 80)
    plan.push("Improve maintainability: triage stale issues and reduce PR review latency.");
  plan.push("Add documentation depth: usage examples, screenshots, and architecture notes.");
  return plan;
}

function suggestFirstPR(topRisks: Finding[], quickWins: Finding[]): string {
  const candidate = topRisks[0] ?? quickWins[0];
  if (!candidate) {
    return "The repository is in good shape. A strong first PR would add a CONTRIBUTING.md and an architecture overview to the README.";
  }
  return `Address "${candidate.title}". ${candidate.recommendation}`;
}

function buildImpact(riskCount: number, quickWinCount: number): string {
  if (riskCount === 0 && quickWinCount === 0) {
    return "Low remaining effort — focus on polish and documentation.";
  }
  return `Resolving the top ${riskCount} risk${riskCount === 1 ? "" : "s"} and ${quickWinCount} quick win${quickWinCount === 1 ? "" : "s"} would meaningfully raise the overall health score and reduce onboarding friction.`;
}
