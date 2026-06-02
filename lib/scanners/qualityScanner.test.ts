import { describe, it, expect } from "vitest";
import { scanQuality } from "@/lib/scanners/qualityScanner";

const fullProject = {
  files: [
    "README.md",
    "package.json",
    "tsconfig.json",
    ".eslintrc.json",
    ".prettierrc",
    ".github/workflows/ci.yml",
    ".env.example",
    "src/index.ts",
    "src/components/Button.tsx",
    "src/index.test.ts",
  ],
  packageJson: {
    scripts: { test: "vitest", lint: "eslint", typecheck: "tsc --noEmit" },
    dependencies: { next: "16.0.0" },
  },
};

describe("scanQuality", () => {
  it("detects all signals in a complete project", () => {
    const result = scanQuality(fullProject);
    expect(result.metrics.hasReadme).toBe(true);
    expect(result.metrics.hasPackageJson).toBe(true);
    expect(result.metrics.hasTypescript).toBe(true);
    expect(result.metrics.hasEslint).toBe(true);
    expect(result.metrics.hasPrettier).toBe(true);
    expect(result.metrics.hasTests).toBe(true);
    expect(result.metrics.hasTestScript).toBe(true);
    expect(result.metrics.hasLintScript).toBe(true);
    expect(result.metrics.hasTypecheckScript).toBe(true);
    expect(result.metrics.hasCi).toBe(true);
    expect(result.metrics.hasEnvExample).toBe(true);
    expect(result.metrics.framework).toBe("next");
    expect(result.score).toBe(100);
    expect(result.findings).toHaveLength(0);
  });

  it("emits findings for a bare project", () => {
    const result = scanQuality({
      files: ["index.js"],
      packageJson: null,
    });
    expect(result.metrics.hasTests).toBe(false);
    expect(result.metrics.hasTypescript).toBe(false);
    expect(result.score).toBeLessThan(60);
    expect(result.findings.some((f) => f.title.includes("test"))).toBe(true);
    expect(result.findings.some((f) => f.severity === "high")).toBe(true);
  });

  it("detects tests via __tests__ folder and .spec files", () => {
    const result = scanQuality({
      files: ["__tests__/app.spec.ts", "tsconfig.json"],
      packageJson: { scripts: {} },
    });
    expect(result.metrics.hasTests).toBe(true);
    expect(result.metrics.hasTypescript).toBe(true);
  });

  it("detects eslint flat config eslint.config.js", () => {
    const result = scanQuality({
      files: ["eslint.config.js", "package.json"],
      packageJson: { scripts: {} },
    });
    expect(result.metrics.hasEslint).toBe(true);
  });
});
