import { describe, it, expect } from "vitest";
import { scanSecurity } from "@/lib/scanners/securityScanner";

describe("scanSecurity", () => {
  it("detects a missing lockfile, license, and security.md", () => {
    const result = scanSecurity({
      files: ["package.json", "src/index.ts"],
      fileContents: {},
    });
    expect(result.metrics.hasLockfile).toBe(false);
    expect(result.metrics.hasLicense).toBe(false);
    expect(result.metrics.hasSecurityMd).toBe(false);
    expect(result.findings.some((f) => f.title.includes("lockfile"))).toBe(true);
  });

  it("recognizes a present lockfile and license", () => {
    const result = scanSecurity({
      files: ["package-lock.json", "LICENSE", "SECURITY.md"],
      fileContents: {},
    });
    expect(result.metrics.hasLockfile).toBe(true);
    expect(result.metrics.hasLicense).toBe(true);
    expect(result.metrics.hasSecurityMd).toBe(true);
  });

  it("detects possible secrets and never leaks the value", () => {
    const result = scanSecurity({
      files: [".env"],
      fileContents: { ".env": "OPENAI_API_KEY=sk-supersecret123456" },
    });
    expect(result.metrics.possibleSecretCount).toBeGreaterThan(0);
    expect(result.findings.some((f) => f.category === "security")).toBe(true);
    expect(JSON.stringify(result)).not.toContain("sk-supersecret123456");
  });

  it("flags a committed .env file as critical", () => {
    const result = scanSecurity({
      files: [".env"],
      fileContents: { ".env": "FOO=bar" },
    });
    expect(result.findings.some((f) => f.severity === "critical")).toBe(true);
  });

  it("recognizes yarn and pnpm lockfiles", () => {
    expect(
      scanSecurity({ files: ["yarn.lock"], fileContents: {} }).metrics.hasLockfile
    ).toBe(true);
    expect(
      scanSecurity({ files: ["pnpm-lock.yaml"], fileContents: {} }).metrics.hasLockfile
    ).toBe(true);
  });
});
