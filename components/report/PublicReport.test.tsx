import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicReport } from "@/components/report/PublicReport";

const data = {
  scan: {
    status: "complete",
    overallScore: 64,
    activityScore: 50,
    qualityScore: 70,
    securityScore: 60,
    aiSummary: "This repo needs concrete follow-up.",
    roadmap: {
      executiveSummary: "Fallback summary",
      topRisks: [],
      quickWins: [],
      longTermPlan: ["Week 1: add CI."],
      firstPullRequest:
        "First PR: fix test coverage.\nWhy: no test command was found.\nChange: add Vitest.\nVerify: run npm test.",
      estimatedImpact: "Expected result: a clearer engineering backlog.",
    },
    publicId: "rp_abc",
    completedAt: "2026-06-02T00:00:00.000Z",
    createdAt: "2026-06-02T00:00:00.000Z",
  },
  repo: {
    githubOwner: "acme",
    githubName: "widget",
    description: "A sample repository",
    stars: 10,
    forks: 2,
    primaryLanguage: "TypeScript",
  },
  findings: [],
  repoMetrics: { commits30d: 3, openIssues: 4, openPrs: 1 },
  qualityMetrics: null,
  securityMetrics: {
    possibleSecretCount: 0,
    hasLockfile: true,
    hasLicense: false,
    hasSecurityMd: false,
  },
};

describe("PublicReport", () => {
  it("surfaces the next recommended PR and repository snapshot near the top", () => {
    render(<PublicReport data={data} />);

    expect(screen.getByText("What To Fix Next")).toBeInTheDocument();
    expect(screen.getByText(/First PR: fix test coverage/)).toBeInTheDocument();
    expect(screen.getByText("Repository Snapshot")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
