import type { Finding } from "@/lib/types";
import { calculateQualityScore } from "@/lib/scanners/scoring";

export type PackageJson = {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  packageManager?: string;
} | null;

export type QualityMetrics = {
  hasReadme: boolean;
  hasPackageJson: boolean;
  hasTypescript: boolean;
  hasEslint: boolean;
  hasPrettier: boolean;
  hasTests: boolean;
  hasTestScript: boolean;
  hasLintScript: boolean;
  hasTypecheckScript: boolean;
  hasCi: boolean;
  hasEnvExample: boolean;
  framework: string | null;
};

export type QualityScanResult = {
  metrics: QualityMetrics;
  score: number;
  findings: Finding[];
};

function detectFramework(pkg: PackageJson): string | null {
  if (!pkg) return null;
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  if (deps["next"]) return "next";
  if (deps["react"]) return "react";
  if (deps["vue"]) return "vue";
  if (deps["svelte"]) return "svelte";
  if (deps["express"]) return "express";
  return null;
}

export function scanQuality(input: {
  files: string[];
  packageJson: PackageJson;
}): QualityScanResult {
  const files = input.files.map((f) => f.toLowerCase());
  const pkg = input.packageJson;
  const has = (pred: (f: string) => boolean) => files.some(pred);

  const scripts = pkg?.scripts ?? {};

  const metrics: QualityMetrics = {
    hasReadme: has((f) => f === "readme.md" || f.endsWith("/readme.md")),
    hasPackageJson: pkg !== null || has((f) => f.endsWith("package.json")),
    hasTypescript:
      has((f) => f.endsWith("tsconfig.json")) ||
      has((f) => f.endsWith(".ts") || f.endsWith(".tsx")),
    hasEslint: has(
      (f) =>
        f.includes(".eslintrc") ||
        f.endsWith("eslint.config.js") ||
        f.endsWith("eslint.config.mjs")
    ),
    hasPrettier: has((f) => f.includes(".prettierrc") || f.endsWith("prettier.config.js")),
    hasTests: has(
      (f) =>
        f.includes("__tests__/") ||
        f.includes("/tests/") ||
        f.startsWith("tests/") ||
        f.endsWith(".test.ts") ||
        f.endsWith(".test.tsx") ||
        f.endsWith(".spec.ts") ||
        f.endsWith(".spec.tsx")
    ),
    hasTestScript: Boolean(scripts["test"]),
    hasLintScript: Boolean(scripts["lint"]),
    hasTypecheckScript: Boolean(
      scripts["typecheck"] || scripts["type-check"] || scripts["tsc"]
    ),
    hasCi: has((f) => f.includes(".github/workflows/")),
    hasEnvExample: has((f) => f.endsWith(".env.example") || f.endsWith(".env.sample")),
    framework: detectFramework(pkg),
  };

  const score = calculateQualityScore({
    hasReadme: metrics.hasReadme,
    hasTypescript: metrics.hasTypescript,
    hasTests: metrics.hasTests,
    hasLintScript: metrics.hasLintScript,
    hasTypecheckScript: metrics.hasTypecheckScript,
    hasCI: metrics.hasCi,
    hasEnvExample: metrics.hasEnvExample,
  });

  const findings: Finding[] = [];
  if (!metrics.hasTests) {
    findings.push({
      category: "quality",
      severity: "high",
      title: "Missing automated tests",
      description: "No test files or test command were detected.",
      recommendation: "Add a test runner such as Vitest or Jest and a `test` script.",
      source: "package.json",
    });
  }
  if (!metrics.hasCi) {
    findings.push({
      category: "quality",
      severity: "high",
      title: "No CI workflow",
      description: "No GitHub Actions workflow was found.",
      recommendation: "Add a CI workflow that runs lint, typecheck, and tests on every push.",
      source: ".github/workflows",
    });
  }
  if (!metrics.hasTypescript) {
    findings.push({
      category: "quality",
      severity: "medium",
      title: "No TypeScript detected",
      description: "The project does not appear to use TypeScript.",
      recommendation: "Adopt TypeScript for type safety, or document why JS is preferred.",
    });
  }
  if (!metrics.hasEnvExample) {
    findings.push({
      category: "documentation",
      severity: "low",
      title: "Missing .env.example",
      description: "No example environment file was found.",
      recommendation: "Add a .env.example documenting required environment variables.",
    });
  }

  return { metrics, score, findings };
}
