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
  delete process.env.CLOUDFLARE_API_KEY;
  delete process.env.CLOUDFLARE_ACCOUNT_ID;
  delete process.env.CLOUDFLARE_MODEL;
});

function setCfEnv() {
  process.env.CLOUDFLARE_API_KEY = "cf-token";
  process.env.CLOUDFLARE_ACCOUNT_ID = "acct-123";
}

describe("getRoadmap", () => {
  it("falls back to the template when Cloudflare env is not configured", async () => {
    const roadmap = await getRoadmap({ repoName: "a/b", scores, findings });
    expect(roadmap.executiveSummary).toContain("a/b");
    expect(roadmap.topRisks).toHaveLength(1);
  });

  it("falls back when only the API key is set (missing account id)", async () => {
    process.env.CLOUDFLARE_API_KEY = "cf-token";
    const roadmap = await getRoadmap({ repoName: "a/b", scores, findings });
    expect(roadmap.executiveSummary).toContain("a/b");
  });

  it("calls the Cloudflare REST endpoint with the account id, model, and bearer token", async () => {
    setCfEnv();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { response: "AI executive summary for a/b." } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await getRoadmap({ repoName: "a/b", scores, findings });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe(
      "https://api.cloudflare.com/client/v4/accounts/acct-123/ai/run/@cf/meta/llama-3.1-8b-instruct"
    );
    expect(calledInit.method).toBe("POST");
    expect(calledInit.headers.Authorization).toBe("Bearer cf-token");
  });

  it("prompts the AI with concrete findings and practical-fix guidance", async () => {
    setCfEnv();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { response: "AI executive summary for a/b." } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await getRoadmap({ repoName: "a/b", scores, findings });

    const [, calledInit] = fetchMock.mock.calls[0];
    const body = JSON.parse(calledInit.body as string);
    const promptText = body.messages.map((m: { content: string }) => m.content).join("\n");
    expect(promptText).toContain("look for concrete engineering work");
    expect(promptText).toContain("avoid generic advice");
    expect(promptText).toContain("Possible exposed secret");
    expect(promptText).toContain("description: x");
    expect(promptText).toContain("recommended work: y");
  });

  it("passes README section evidence to the AI prompt when findings include it", async () => {
    setCfEnv();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { response: "AI executive summary for a/b." } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await getRoadmap({
      repoName: "a/b",
      scores,
      findings: [
        {
          category: "documentation",
          severity: "low",
          title: "Incomplete README",
          description:
            "The README covers setup and environment variables, but is missing usage, screenshots or demo, and license.",
          recommendation:
            "Add a Usage section, screenshots or demo, and a License section.",
          metadata: {
            presentSections: ["setup", "environment variables", "tech stack"],
            missingSections: ["usage", "screenshots or demo", "license"],
          },
        },
      ],
    });

    const [, calledInit] = fetchMock.mock.calls[0];
    const body = JSON.parse(calledInit.body as string);
    const promptText = body.messages.map((m: { content: string }) => m.content).join("\n");
    expect(promptText).toContain("present sections: setup, environment variables, tech stack");
    expect(promptText).toContain("missing sections: usage, screenshots or demo, license");
  });

  it("uses the AI executive summary but keeps template-derived risks and quick wins", async () => {
    setCfEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ result: { response: "AI executive summary for a/b." } }),
      })
    );
    const roadmap = await getRoadmap({ repoName: "a/b", scores, findings });
    expect(roadmap.executiveSummary).toBe("AI executive summary for a/b.");
    // Risks/quick wins/plan come from the deterministic generator, not the LLM.
    expect(roadmap.topRisks).toHaveLength(1);
    expect(roadmap.topRisks[0].title).toBe("Possible exposed secret");
    expect(roadmap.firstPullRequest.length).toBeGreaterThan(0);
  });

  it("parses the alternate choices[].message.content response shape", async () => {
    setCfEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: { choices: [{ message: { content: "Alt-shape summary." } }] },
        }),
      })
    );
    const roadmap = await getRoadmap({ repoName: "a/b", scores, findings });
    expect(roadmap.executiveSummary).toBe("Alt-shape summary.");
  });

  it("honors a CLOUDFLARE_MODEL override in the URL", async () => {
    setCfEnv();
    process.env.CLOUDFLARE_MODEL = "@cf/meta/llama-3.3-70b-instruct";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { response: "summary" } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await getRoadmap({ repoName: "a/b", scores, findings });
    expect(fetchMock.mock.calls[0][0]).toContain(
      "/ai/run/@cf/meta/llama-3.3-70b-instruct"
    );
  });

  it("falls back to the template when the call rejects", async () => {
    setCfEnv();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const roadmap = await getRoadmap({ repoName: "a/b", scores, findings });
    expect(roadmap.executiveSummary).toContain("a/b");
  });

  it("falls back when Cloudflare returns a non-ok status", async () => {
    setCfEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "err" })
    );
    const roadmap = await getRoadmap({ repoName: "a/b", scores, findings });
    expect(roadmap.executiveSummary).toContain("a/b");
  });

  it("falls back when the response has no usable summary text", async () => {
    setCfEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: {} }) })
    );
    const roadmap = await getRoadmap({ repoName: "a/b", scores, findings });
    expect(roadmap.executiveSummary).toContain("a/b");
  });
});
