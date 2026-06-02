import { describe, it, expect } from "vitest";
import {
  calculateActivityScore,
  calculateQualityScore,
  calculateSecurityScore,
  calculatePRBottleneckScore,
  calculateReadmeScore,
  getActivityStatus,
  calculateOverallScore,
} from "@/lib/scanners/scoring";

describe("getActivityStatus", () => {
  it("labels recency buckets", () => {
    expect(getActivityStatus(3)).toBe("Active");
    expect(getActivityStatus(20)).toBe("Moderately active");
    expect(getActivityStatus(60)).toBe("Stale");
    expect(getActivityStatus(200)).toBe("Inactive");
  });
});

describe("calculateActivityScore", () => {
  it("is 100 for a healthy active repo", () => {
    expect(
      calculateActivityScore({
        commits30d: 50,
        daysSinceLastCommit: 2,
        staleIssues: 0,
        stalePrs: 0,
      })
    ).toBe(100);
  });

  it("clamps to 0 and never negative", () => {
    expect(
      calculateActivityScore({
        commits30d: 0,
        daysSinceLastCommit: 400,
        staleIssues: 50,
        stalePrs: 50,
      })
    ).toBe(0);
  });
});

describe("calculateQualityScore", () => {
  it("is 100 when everything present", () => {
    expect(
      calculateQualityScore({
        hasReadme: true,
        hasTypescript: true,
        hasTests: true,
        hasLintScript: true,
        hasTypecheckScript: true,
        hasCI: true,
        hasEnvExample: true,
      })
    ).toBe(100);
  });

  it("drops for missing essentials", () => {
    expect(
      calculateQualityScore({
        hasReadme: false,
        hasTypescript: false,
        hasTests: false,
        hasLintScript: false,
        hasTypecheckScript: false,
        hasCI: false,
        hasEnvExample: false,
      })
    ).toBe(0);
  });
});

describe("calculateSecurityScore", () => {
  it("penalizes secrets heavily", () => {
    const score = calculateSecurityScore({
      possibleSecrets: 1,
      criticalVulnerabilities: 0,
      highVulnerabilities: 0,
      hasSecurityMd: true,
      hasLockfile: true,
      hasLicense: true,
    });
    expect(score).toBe(80);
  });

  it("clamps to 0", () => {
    expect(
      calculateSecurityScore({
        possibleSecrets: 10,
        criticalVulnerabilities: 5,
        highVulnerabilities: 5,
        hasSecurityMd: false,
        hasLockfile: false,
        hasLicense: false,
      })
    ).toBe(0);
  });
});

describe("calculatePRBottleneckScore", () => {
  it("penalizes age and stale prs", () => {
    expect(calculatePRBottleneckScore(10, 2)).toBe(54);
  });
});

describe("calculateReadmeScore", () => {
  it("rewards a complete readme", () => {
    const readme =
      "# Project\n".padEnd(400, "x") +
      "\ninstall\nusage\nenvironment\nscreenshot\nlicense\ntech stack";
    expect(calculateReadmeScore(readme)).toBe(100);
  });

  it("is low for an empty readme", () => {
    expect(calculateReadmeScore("")).toBe(0);
  });
});

describe("calculateOverallScore (no deployed url weights)", () => {
  it("weights activity 30 / quality 35 / security 25 / docs 10", () => {
    expect(
      calculateOverallScore({
        activity: 100,
        quality: 100,
        security: 100,
        documentation: 100,
      })
    ).toBe(100);
  });

  it("computes a weighted blend", () => {
    expect(
      calculateOverallScore({
        activity: 50,
        quality: 80,
        security: 60,
        documentation: 100,
      })
    ).toBe(68); // 50*.3 + 80*.35 + 60*.25 + 100*.1 = 15+28+15+10
  });
});
