import type { Finding, Roadmap, Scores } from "@/lib/types";
import { generateTemplateRoadmap } from "@/lib/scanners/roadmapGenerator";

const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct";

/**
 * Generates the roadmap for a scan. The deterministic template generator always
 * produces a complete, structured roadmap (top risks, quick wins, plan, first PR,
 * impact). When Cloudflare Workers AI is configured, we additionally ask it to
 * write a higher-quality executive summary and swap that single field in.
 *
 * Cloudflare is called via the REST API directly from this server function (no
 * separate Worker deployment): a `CLOUDFLARE_API_KEY` + `CLOUDFLARE_ACCOUNT_ID`
 * pair is all that is required. If either is missing, or the call fails, slows,
 * or returns nothing usable, the template summary is used — so a scan never fails
 * because AI is unavailable.
 */
export async function getRoadmap(input: {
  repoName: string;
  scores: Scores;
  findings: Finding[];
}): Promise<Roadmap> {
  const roadmap = generateTemplateRoadmap(input);

  const apiKey = process.env.CLOUDFLARE_API_KEY;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!apiKey || !accountId) return roadmap;

  const aiSummary = await generateExecutiveSummary(input, apiKey, accountId);
  if (!aiSummary) return roadmap;

  return { ...roadmap, executiveSummary: aiSummary };
}

async function generateExecutiveSummary(
  input: { repoName: string; scores: Scores; findings: Finding[] },
  apiKey: string,
  accountId: string
): Promise<string | null> {
  const model = process.env.CLOUDFLARE_MODEL || DEFAULT_MODEL;
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const topRisks = input.findings
    .filter((f) => f.severity === "critical" || f.severity === "high")
    .slice(0, 5)
    .map((f) => f.title);

  const systemPrompt =
    "You are a senior engineering reviewer. Write a concise, professional, non-hyperbolic " +
    "executive summary (3-4 sentences) of a repository's engineering health. Output only the summary text.";
  const userPrompt = [
    `Repository: ${input.repoName}`,
    `Overall score: ${input.scores.overall}/100 (activity ${input.scores.activity}, quality ${input.scores.quality}, security ${input.scores.security}).`,
    `Top risks: ${topRisks.join("; ") || "none detected"}.`,
  ].join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 400,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Defensive parse — Workers AI response shape varies by model.
    const text =
      data?.result?.response ??
      data?.result?.choices?.[0]?.message?.content ??
      data?.result?.content ??
      "";
    const trimmed = typeof text === "string" ? text.trim() : "";
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
