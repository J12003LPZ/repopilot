import type { Finding } from "@/lib/types";
import { calculateReadmeScore } from "@/lib/scanners/scoring";
import {
  analyzeReadmeSections,
  type ReadmeSectionKey,
} from "@/lib/scanners/readmeAnalysis";

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

  const analysis = analyzeReadmeSections(readme);
  const score = calculateReadmeScore(readme);

  if (score < 80 && analysis.missingSections.length > 0) {
    findings.push({
      category: "documentation",
      severity: "low",
      title: "Incomplete README",
      description: buildIncompleteReadmeDescription(analysis, score),
      recommendation: buildMissingSectionRecommendation(analysis.missingSections),
      source: "README.md",
      metadata: {
        presentSections: analysis.presentSections,
        missingSections: analysis.missingSections,
      },
    });
  }

  return { score, hasReadme: true, findings };
}

function buildIncompleteReadmeDescription(
  analysis: ReturnType<typeof analyzeReadmeSections>,
  score: number
): string {
  const covered =
    analysis.presentSections.length > 0
      ? `covers ${formatSectionList(analysis.presentSections)}`
      : "does not clearly cover the expected onboarding sections";
  return `The README ${covered}, but is missing ${formatSectionList(
    analysis.missingSections
  )} (score ${score}/100).`;
}

function buildMissingSectionRecommendation(missingSections: ReadmeSectionKey[]): string {
  return `Add ${formatSectionList(
    missingSections.map(toRecommendationLabel)
  )}. Keep the existing README material and focus the update on these gaps.`;
}

function toRecommendationLabel(section: ReadmeSectionKey): string {
  switch (section) {
    case "setup":
      return "an Installation or Setup section";
    case "usage":
      return "a Usage section";
    case "environment variables":
      return "an Environment Variables section";
    case "screenshots or demo":
      return "screenshots or demo";
    case "license":
      return "a License section";
    case "tech stack":
      return "a Tech Stack section";
  }
}

function formatSectionList(sections: string[]): string {
  if (sections.length === 0) return "none";
  if (sections.length === 1) return sections[0];
  if (sections.length === 2) return `${sections[0]} and ${sections[1]}`;
  return `${sections.slice(0, -1).join(", ")}, and ${sections[sections.length - 1]}`;
}
