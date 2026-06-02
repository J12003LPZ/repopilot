interface Env {
  AI: { run: (model: string, input: unknown) => Promise<{ response?: string }> };
  SHARED_SECRET?: string;
}

type RequestBody = {
  repoName: string;
  scores: Record<string, number | null>;
  findings: Array<{
    category: string;
    severity: string;
    title: string;
    description: string;
    recommendation: string;
  }>;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }
    if (env.SHARED_SECRET) {
      const auth = request.headers.get("Authorization");
      if (auth !== `Bearer ${env.SHARED_SECRET}`) {
        return new Response("Forbidden", { status: 403 });
      }
    }

    let body: RequestBody;
    try {
      body = await request.json();
    } catch {
      return new Response("Bad request", { status: 400 });
    }

    const topRisks = body.findings
      .filter((f) => f.severity === "critical" || f.severity === "high")
      .slice(0, 5);
    const quickWins = body.findings
      .filter((f) => f.severity === "low" || f.severity === "medium")
      .slice(0, 5);

    const prompt = [
      `You are an engineering reviewer. Write a concise executive summary (3-4 sentences) for the repository "${body.repoName}".`,
      `Overall score: ${body.scores.overall}/100. Activity ${body.scores.activity}, quality ${body.scores.quality}, security ${body.scores.security}.`,
      `Top risks: ${topRisks.map((r) => r.title).join("; ") || "none"}.`,
      `Be specific, professional, and non-hyperbolic. Output only the summary text.`,
    ].join("\n");

    let executiveSummary = "";
    try {
      const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [{ role: "user", content: prompt }],
      });
      executiveSummary = (result.response ?? "").trim();
    } catch {
      executiveSummary = "";
    }

    if (!executiveSummary) {
      // Let the Next.js app fall back to its template by signalling failure.
      return new Response("AI unavailable", { status: 502 });
    }

    const roadmap = {
      executiveSummary,
      topRisks,
      quickWins,
      longTermPlan: [
        "Strengthen automated testing and CI coverage.",
        "Harden security posture and dependency hygiene.",
        "Improve documentation depth and onboarding.",
      ],
      firstPullRequest:
        topRisks[0]
          ? `Address "${topRisks[0].title}": ${topRisks[0].recommendation}`
          : "Add a CONTRIBUTING.md and architecture overview.",
      estimatedImpact:
        "Resolving the highlighted risks will measurably improve maintainability and reviewer confidence.",
    };

    return Response.json(roadmap);
  },
};
