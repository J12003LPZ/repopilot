import { describe, it, expect } from "vitest";
import { scanReadme } from "@/lib/scanners/readmeScanner";

describe("scanReadme", () => {
  it("returns score 0 and a finding when readme is absent", () => {
    const result = scanReadme(null);
    expect(result.score).toBe(0);
    expect(result.findings.some((f) => f.category === "documentation")).toBe(true);
  });

  it("scores a rich readme highly and emits no missing-readme finding", () => {
    const readme =
      "# Title\n".padEnd(400, "x") +
      "\n## Installation\nnpm install\n## Usage\nrun it\n## Environment\nENV vars\n## Screenshots\n![](x)\n## License\nMIT\n## Tech stack\nNext.js";
    const result = scanReadme(readme);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.findings.some((f) => f.title.toLowerCase().includes("missing readme"))).toBe(false);
  });

  it("flags a thin readme as low severity documentation finding", () => {
    const result = scanReadme("# Title");
    expect(result.score).toBeLessThan(50);
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it("only recommends README sections that are actually missing", () => {
    const storyCrafterReadme = [
      "# Story Crafter",
      "Generate short stories with Google Gemma 3 (via OpenRouter) and download them as self-contained HTML storybooks with built-in voice narration.",
      "## Setup",
      "npm install",
      "Copy .env.example to .env.local and fill in your OpenRouter key.",
      "Get a free key at https://openrouter.ai/keys",
      "Run the API in one terminal: npx vercel dev --listen 3001",
      "Run the app in another: npm run dev",
      "Open http://localhost:5173.",
      "## Scripts",
      "npm run dev - Vite dev server",
      "npm run build - production build",
      "npm test - run Vitest",
      "npx vercel dev - local serverless runtime for /api/*",
      "## How it works",
      "React + Tailwind front-end with three routes (/, /weaving, /result).",
      "/api/generate is a Vercel serverless function that calls OpenRouter's OpenAI-compatible endpoint.",
      "The generated story is rendered in-app and can be exported as a single self-contained HTML file.",
      "## Deploying",
      "Push to GitHub, import the repo in Vercel, set OPENROUTER_API_KEY as a project environment variable.",
    ].join("\n");

    const result = scanReadme(storyCrafterReadme);
    const finding = result.findings.find((f) => f.title === "Incomplete README");

    expect(finding).toBeDefined();
    expect(finding?.recommendation).toContain("Usage");
    expect(finding?.recommendation).toContain("screenshots or demo");
    expect(finding?.recommendation).toContain("License");
    expect(finding?.recommendation).not.toContain("installation");
    expect(finding?.recommendation).not.toContain("environment variables");
    expect(finding?.recommendation).not.toContain("tech-stack");
    expect(finding?.metadata).toMatchObject({
      presentSections: expect.arrayContaining([
        "setup",
        "environment variables",
        "tech stack",
      ]),
      missingSections: expect.arrayContaining([
        "usage",
        "screenshots or demo",
        "license",
      ]),
    });
  });
});
