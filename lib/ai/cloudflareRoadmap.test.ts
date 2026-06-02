import { describe, it, expect, vi, afterEach } from "vitest";
import { getRoadmap } from "@/lib/ai/cloudflareRoadmap";
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
    description: "x",
    recommendation: "y",
  },
];

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.CLOUDFLARE_AI_URL;
});

describe("getRoadmap", () => {
  it("falls back to the template when no CLOUDFLARE_AI_URL is set", async () => {
    const roadmap = await getRoadmap({ repoName: "a/b", scores, findings });
    expect(roadmap.executiveSummary).toContain("a/b");
    expect(roadmap.topRisks).toHaveLength(1);
  });

  it("uses the worker response when the call succeeds", async () => {
    process.env.CLOUDFLARE_AI_URL = "https://worker.example/roadmap";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          executiveSummary: "AI summary for a/b",
          topRisks: findings,
          quickWins: [],
          longTermPlan: ["do x"],
          firstPullRequest: "pr",
          estimatedImpact: "impact",
        }),
      })
    );
    const roadmap = await getRoadmap({ repoName: "a/b", scores, findings });
    expect(roadmap.executiveSummary).toBe("AI summary for a/b");
  });

  it("falls back to the template when the worker errors", async () => {
    process.env.CLOUDFLARE_AI_URL = "https://worker.example/roadmap";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const roadmap = await getRoadmap({ repoName: "a/b", scores, findings });
    expect(roadmap.executiveSummary).toContain("a/b");
  });

  it("falls back when the worker returns a non-ok status", async () => {
    process.env.CLOUDFLARE_AI_URL = "https://worker.example/roadmap";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const roadmap = await getRoadmap({ repoName: "a/b", scores, findings });
    expect(roadmap.executiveSummary).toContain("a/b");
  });
});
