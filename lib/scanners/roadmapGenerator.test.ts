import { describe, it, expect } from "vitest";
import { generateTemplateRoadmap } from "@/lib/scanners/roadmapGenerator";
import type { Finding, Scores } from "@/lib/types";

const scores: Scores = {
  overall: 64,
  activity: 50,
  quality: 70,
  security: 60,
  performance: null,
  accessibility: null,
};

const findings: Finding[] = [
  {
    category: "security",
    severity: "critical",
    title: "Possible exposed secret",
    description: "An API key pattern was found.",
    recommendation: "Rotate and move to env vars.",
  },
  {
    category: "quality",
    severity: "high",
    title: "Missing test script",
    description: "No test command found.",
    recommendation: "Add Vitest and a test script.",
  },
  {
    category: "documentation",
    severity: "low",
    title: "README missing screenshots",
    description: "No screenshots.",
    recommendation: "Add screenshots.",
  },
];

describe("generateTemplateRoadmap", () => {
  it("includes the repo name in the executive summary", () => {
    const roadmap = generateTemplateRoadmap({
      repoName: "acme/widget",
      scores,
      findings,
    });
    expect(roadmap.executiveSummary).toContain("acme/widget");
    expect(roadmap.executiveSummary).toContain("64");
  });

  it("ranks critical and high findings into topRisks, max 5", () => {
    const roadmap = generateTemplateRoadmap({
      repoName: "acme/widget",
      scores,
      findings,
    });
    expect(roadmap.topRisks.length).toBeLessThanOrEqual(5);
    expect(roadmap.topRisks[0].severity).toBe("critical");
    expect(roadmap.topRisks.every((f) => f.severity === "critical" || f.severity === "high")).toBe(true);
  });

  it("puts low/medium effort items into quickWins", () => {
    const roadmap = generateTemplateRoadmap({
      repoName: "acme/widget",
      scores,
      findings,
    });
    expect(roadmap.quickWins.some((f) => f.title.includes("screenshots"))).toBe(true);
  });

  it("suggests a first PR string and an impact statement", () => {
    const roadmap = generateTemplateRoadmap({
      repoName: "acme/widget",
      scores,
      findings,
    });
    expect(roadmap.firstPullRequest.length).toBeGreaterThan(0);
    expect(roadmap.estimatedImpact.length).toBeGreaterThan(0);
    expect(Array.isArray(roadmap.longTermPlan)).toBe(true);
  });

  it("handles a clean repo with no findings", () => {
    const roadmap = generateTemplateRoadmap({
      repoName: "acme/clean",
      scores: { ...scores, overall: 95 },
      findings: [],
    });
    expect(roadmap.topRisks).toHaveLength(0);
    expect(roadmap.executiveSummary).toContain("acme/clean");
  });
});
