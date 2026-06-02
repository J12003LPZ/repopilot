import type { Finding, Roadmap, Scores } from "@/lib/types";
import { generateTemplateRoadmap } from "@/lib/scanners/roadmapGenerator";

export async function getRoadmap(input: {
  repoName: string;
  scores: Scores;
  findings: Finding[];
}): Promise<Roadmap> {
  const fallback = () => generateTemplateRoadmap(input);

  const url = process.env.CLOUDFLARE_AI_URL;
  if (!url) return fallback();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.CLOUDFLARE_AI_SECRET
          ? { Authorization: `Bearer ${process.env.CLOUDFLARE_AI_SECRET}` }
          : {}),
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return fallback();
    const data = (await res.json()) as Partial<Roadmap>;
    if (!data || typeof data.executiveSummary !== "string") return fallback();
    return {
      executiveSummary: data.executiveSummary,
      topRisks: data.topRisks ?? input.findings.filter((f) => f.severity === "critical" || f.severity === "high").slice(0, 5),
      quickWins: data.quickWins ?? [],
      longTermPlan: data.longTermPlan ?? [],
      firstPullRequest: data.firstPullRequest ?? "",
      estimatedImpact: data.estimatedImpact ?? "",
    };
  } catch {
    return fallback();
  }
}
