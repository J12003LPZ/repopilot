import { describe, it, expect, vi, afterEach } from "vitest";
import { parseAiFindings, generateAiFindings } from "@/lib/ai/aiFindings";
import type { Scores } from "@/lib/types";

const scores: Scores = {
  overall: 64,
  activity: 50,
  quality: 70,
  security: 60,
  performance: null,
  accessibility: null,
};

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.CLOUDFLARE_API_KEY;
  delete process.env.CLOUDFLARE_ACCOUNT_ID;
  delete process.env.CLOUDFLARE_MODEL;
});

describe("parseAiFindings", () => {
  it("parses a clean JSON array of valid findings", () => {
    const text = JSON.stringify([
      {
        category: "security",
        severity: "high",
        title: "Unvalidated input",
        description: "Route handler trusts req body in app/api/x/route.ts.",
        recommendation: "Validate with zod before use.",
        file: "app/api/x/route.ts",
        startLine: 12,
        endLine: 20,
      },
    ]);
    const findings = parseAiFindings(text);
    expect(findings).toHaveLength(1);
    expect(findings[0].title).toBe("Unvalidated input");
    expect(findings[0].metadata?.origin).toBe("ai");
    expect(findings[0].source).toBe("app/api/x/route.ts:12-20");
    expect(findings[0].metadata?.citation).toEqual({
      file: "app/api/x/route.ts",
      startLine: 12,
      endLine: 20,
    });
  });

  it("extracts JSON wrapped in markdown fences and prose", () => {
    const text =
      "Here are the issues I found:\n```json\n" +
      JSON.stringify([
        {
          category: "quality",
          severity: "medium",
          title: "No error handling",
          description: "fetch in lib/a.ts has no try/catch.",
          recommendation: "Wrap in try/catch.",
          file: "lib/a.ts",
          startLine: 4,
          endLine: 9,
        },
      ]) +
      "\n```\nHope that helps!";
    const findings = parseAiFindings(text);
    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe("quality");
  });

  it("drops items missing a citation or with invalid enums, keeps valid ones", () => {
    const text = JSON.stringify([
      {
        category: "not-a-real-category",
        severity: "high",
        title: "bad enum",
        description: "x",
        recommendation: "y",
        file: "lib/a.ts",
        startLine: 1,
        endLine: 2,
      },
      {
        category: "quality",
        severity: "low",
        title: "missing citation",
        description: "x",
        recommendation: "y",
      },
      {
        category: "maintainability",
        severity: "low",
        title: "good",
        description: "x",
        recommendation: "y",
        file: "lib/a.ts",
        startLine: 3,
        endLine: 4,
      },
    ]);
    const findings = parseAiFindings(text);
    expect(findings).toHaveLength(1);
    expect(findings[0].title).toBe("good");
  });

  it("drops an item whose endLine is before its startLine", () => {
    const text = JSON.stringify([
      {
        category: "security",
        severity: "high",
        title: "inverted range",
        description: "x",
        recommendation: "y",
        file: "lib/a.ts",
        startLine: 20,
        endLine: 5,
      },
    ]);
    expect(parseAiFindings(text)).toEqual([]);
  });

  it("returns [] for non-JSON text", () => {
    expect(parseAiFindings("I could not find any issues.")).toEqual([]);
  });

  it("returns [] for truncated/invalid JSON", () => {
    expect(parseAiFindings('[{"category":"security","severity":"high",')).toEqual([]);
  });

  it("returns [] when the JSON is an object, not an array", () => {
    expect(parseAiFindings('{"category":"security"}')).toEqual([]);
  });

  it("is not fooled by brackets inside string values", () => {
    const text = JSON.stringify([
      {
        category: "security",
        severity: "low",
        title: "Array index [0] misuse",
        description: "Uses arr[0] without a length check in lib/a.ts.",
        recommendation: "Check arr.length first.",
        file: "lib/a.ts",
        startLine: 5,
        endLine: 5,
      },
    ]);
    const findings = parseAiFindings(text);
    expect(findings).toHaveLength(1);
    expect(findings[0].title).toContain("[0]");
  });

  it("honors the maxFindings cap", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      category: "quality",
      severity: "low",
      title: `issue ${i}`,
      description: "x",
      recommendation: "y",
      file: "lib/a.ts",
      startLine: i + 1,
      endLine: i + 1,
    }));
    const findings = parseAiFindings(JSON.stringify(items), 3);
    expect(findings).toHaveLength(3);
  });
});

describe("generateAiFindings", () => {
  it("returns disabled status when credentials are missing", async () => {
    const result = await generateAiFindings({
      repoName: "a/b",
      scores,
      evidence: "--- FILE: a.ts ---\nx",
      scannerFindings: [],
    });
    expect(result.findings).toEqual([]);
    expect(result.status).toBe("disabled:no-credentials");
  });

  it("returns disabled status when there is no evidence", async () => {
    process.env.CLOUDFLARE_API_KEY = "k";
    process.env.CLOUDFLARE_ACCOUNT_ID = "a";
    const result = await generateAiFindings({
      repoName: "a/b",
      scores,
      evidence: "   ",
      scannerFindings: [],
    });
    expect(result.status).toBe("disabled:no-evidence");
  });

  it("calls the API with response_format and returns validated, ai-tagged findings", async () => {
    process.env.CLOUDFLARE_API_KEY = "k";
    process.env.CLOUDFLARE_ACCOUNT_ID = "a";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          response: JSON.stringify([
            {
              category: "security",
              severity: "critical",
              title: "SQL injection",
              description: "Raw string interpolation in lib/db.ts.",
              recommendation: "Use parameterized queries.",
              file: "lib/db.ts",
              startLine: 14,
              endLine: 16,
            },
          ]),
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateAiFindings({
      repoName: "a/b",
      scores,
      evidence: "--- FILE: lib/db.ts (lines 14-16) ---\n14│ const q = `SELECT ${id}`;",
      scannerFindings: [],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.response_format?.type).toBe("json_schema");
    expect(result.status).toBe("ok");
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].metadata?.origin).toBe("ai");
    expect(result.findings[0].source).toBe("lib/db.ts:14-16");
  });

  it("falls back gracefully on a non-ok response", async () => {
    process.env.CLOUDFLARE_API_KEY = "k";
    process.env.CLOUDFLARE_ACCOUNT_ID = "a";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404, text: async () => "no model" })
    );
    const result = await generateAiFindings({
      repoName: "a/b",
      scores,
      evidence: "--- FILE: a.ts ---\nx",
      scannerFindings: [],
    });
    expect(result.findings).toEqual([]);
    expect(result.status).toBe("fallback:http-404");
  });

  it("falls back when the model returns no valid findings", async () => {
    process.env.CLOUDFLARE_API_KEY = "k";
    process.env.CLOUDFLARE_ACCOUNT_ID = "a";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ result: { response: "No issues found." } }),
      })
    );
    const result = await generateAiFindings({
      repoName: "a/b",
      scores,
      evidence: "--- FILE: a.ts ---\nx",
      scannerFindings: [],
    });
    expect(result.status).toBe("fallback:no-valid-findings");
  });
});
