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
  const weakest = weakestScore(scores);
  return `${repoName} has an overall health score of ${scores.overall}/100 (${health}). Activity ${scores.activity}, quality ${scores.quality}, security ${scores.security}. ${riskClause} Start with ${weakest.label.toLowerCase()} work because it is the weakest measured area.`;
}

function buildLongTermPlan(scores: Scores): string[] {
  const plan: string[] = [];
  if (scores.quality < 80) {
    plan.push(
      "Week 1: raise the quality baseline by adding or fixing CI, linting, type checks, and a repeatable test command."
    );
  }
  if (scores.security < 80) {
    plan.push(
      "Week 1: close security hygiene gaps with a committed lockfile, SECURITY.md, dependency audit, and secret-handling review."
    );
  }
  if (scores.activity < 80) {
    plan.push(
      "Week 2: reduce maintenance drag by triaging stale issues, labeling blocked PRs, and documenting review ownership."
    );
  }
  plan.push(
    "Week 2: improve the report surface for new contributors with setup steps, screenshots, architecture notes, and a short contributing path."
  );
  plan.push(
    "Ongoing: keep the score honest by running tests, lint, type checks, and dependency audits before every release."
  );
  return plan;
}

function suggestFirstPR(topRisks: Finding[], quickWins: Finding[]): string {
  const candidate = topRisks[0] ?? quickWins[0];
  if (!candidate) {
    return [
      "First PR: add a CONTRIBUTING.md and an architecture overview to the README.",
      "Why: the scan did not find urgent defects, so the best next report improvement is making healthy practices visible and repeatable.",
      "Change: document setup, test commands, release checks, ownership, and the main runtime boundaries.",
      "Verify: a new contributor can clone the repo, run the documented commands, and understand where to make a first change.",
    ].join("\n");
  }
  return [
    `First PR: ${candidate.title}.`,
    `Why: ${candidate.description}`,
    `Change: ${candidate.recommendation}`,
    `Verify: add or update the smallest relevant check for ${candidate.category} so this does not regress.`,
  ].join("\n");
}

function buildImpact(riskCount: number, quickWinCount: number): string {
  if (riskCount === 0 && quickWinCount === 0) {
    return "Expected result: low remaining engineering risk, clearer onboarding, and a report that is easier to trust during review.";
  }
  return `Expected result: resolving the top ${riskCount} risk${riskCount === 1 ? "" : "s"} and ${quickWinCount} quick win${quickWinCount === 1 ? "" : "s"} should raise the health score, reduce reviewer friction, and turn the report into a concrete engineering backlog.`;
}

function weakestScore(scores: Scores): { label: string; value: number } {
  return [
    { label: "Activity", value: scores.activity },
    { label: "Quality", value: scores.quality },
    { label: "Security", value: scores.security },
  ].sort((a, b) => a.value - b.value)[0];
}
