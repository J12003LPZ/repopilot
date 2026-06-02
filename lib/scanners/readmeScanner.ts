import type { Finding } from "@/lib/types";
import { calculateReadmeScore } from "@/lib/scanners/scoring";

export type ReadmeScanResult = {
  score: number;
  hasReadme: boolean;
  findings: Finding[];
};

export function scanReadme(readme: string | null): ReadmeScanResult {
  const findings: Finding[] = [];

  if (!readme || readme.trim().length === 0) {
    findings.push({
      category: "documentation",
      severity: "high",
      title: "Missing README",
      description: "The repository does not contain a README file.",
      recommendation:
        "Add a README with a project description, installation steps, usage, and a tech stack section.",
      source: "README.md",
    });
    return { score: 0, hasReadme: false, findings };
  }

  const score = calculateReadmeScore(readme);

  if (score < 60) {
    findings.push({
      category: "documentation",
      severity: "low",
      title: "Incomplete README",
      description: `The README is missing common sections (score ${score}/100).`,
      recommendation:
        "Add installation, usage, environment variables, screenshots, license, and tech-stack sections.",
      source: "README.md",
    });
  }

  return { score, hasReadme: true, findings };
}
