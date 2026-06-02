import type { ScanPayload } from "@/lib/useScanPolling";
import type { Finding, Scores } from "@/lib/types";
import { generateTemplateRoadmap } from "@/lib/scanners/roadmapGenerator";

const demoFindings: Finding[] = [
  {
    category: "security",
    severity: "critical",
    title: "Possible exposed secret",
    description:
      "A potential API key or credential was found hardcoded in the repository source code, which could be harvested by anyone with read access to the repo.",
    recommendation:
      "Rotate the exposed credential immediately, then move all secrets to environment variables or a secrets manager. Add a pre-commit hook (e.g. detect-secrets) to prevent future leaks.",
  },
  {
    category: "quality",
    severity: "high",
    title: "Missing automated tests",
    description:
      "No test files were detected in the repository. Without automated tests, regressions are caught only in production and onboarding new contributors is risky.",
    recommendation:
      "Add a test framework (Jest, Vitest, or similar) and write unit tests for the core business logic. Aim for at least 60% coverage before the next release.",
  },
  {
    category: "quality",
    severity: "high",
    title: "No CI workflow",
    description:
      "There is no continuous-integration configuration (GitHub Actions, CircleCI, etc.). Every push is unvalidated, meaning broken builds and test failures reach the main branch.",
    recommendation:
      "Create a `.github/workflows/ci.yml` that installs dependencies, runs lint, type-checks, and tests on every push and pull request.",
  },
  {
    category: "maintainability",
    severity: "medium",
    title: "Pull request review bottleneck",
    description:
      "Several pull requests have been open for more than 14 days without a review. This slows delivery and creates long-lived divergent branches that are expensive to merge.",
    recommendation:
      "Adopt a CODEOWNERS file to auto-assign reviewers, set a 48-hour SLA for first review, and schedule a weekly PR triage meeting.",
  },
  {
    category: "security",
    severity: "medium",
    title: "Missing dependency lockfile",
    description:
      "No package-lock.json or yarn.lock was found. Without a lockfile, dependency versions are non-deterministic across environments and supply-chain attacks are harder to detect.",
    recommendation:
      "Run `npm install` (or `yarn install`) to generate a lockfile, then commit it to the repository. Enable Dependabot or Renovate for automated dependency updates.",
  },
  {
    category: "quality",
    severity: "medium",
    title: "No TypeScript detected",
    description:
      "The repository does not appear to use TypeScript. Untyped JavaScript codebases accumulate subtle bugs that static analysis would catch at compile time.",
    recommendation:
      "Incrementally migrate to TypeScript by adding a `tsconfig.json` in strict mode and renaming files from `.js` to `.ts`. Start with the public API surface and utility modules.",
  },
  {
    category: "documentation",
    severity: "low",
    title: "Incomplete README",
    description:
      "The README lacks installation instructions, environment-variable documentation, and contributing guidelines. New contributors cannot get started without tribal knowledge.",
    recommendation:
      "Expand the README with: quick-start steps, a list of required environment variables, development workflow, and a link to the contributing guide.",
  },
  {
    category: "security",
    severity: "low",
    title: "Missing SECURITY.md",
    description:
      "There is no SECURITY.md file defining a vulnerability disclosure policy. Without one, security researchers do not know how to responsibly report issues.",
    recommendation:
      "Add a SECURITY.md file at the repository root that describes the supported versions and the process for reporting security vulnerabilities privately.",
  },
];

const demoScores: Scores = {
  overall: 72,
  activity: 68,
  quality: 65,
  security: 70,
  performance: null,
  accessibility: null,
};

const demoRoadmap = generateTemplateRoadmap({
  repoName: "acme/payments-service",
  scores: demoScores,
  findings: demoFindings,
});

export const demoScanPayload: ScanPayload = {
  scan: {
    id: "demo",
    status: "complete",
    overallScore: 72,
    activityScore: 68,
    qualityScore: 65,
    securityScore: 70,
    aiSummary: demoRoadmap.executiveSummary,
    roadmap: demoRoadmap,
    publicId: "rp_demo",
    deployedUrl: null,
    errorMessage: null,
  },
  repo: {
    githubOwner: "acme",
    githubName: "payments-service",
    description:
      "A TypeScript payments microservice handling billing, invoicing, and webhooks.",
    stars: 1284,
    forks: 143,
    primaryLanguage: "TypeScript",
  },
  findings: demoFindings,
  repoMetrics: {
    commits30d: 42,
    commits90d: 118,
    openIssues: 23,
    openPrs: 7,
    staleIssues: 4,
    stalePrs: 2,
    contributorCount: 11,
  },
  qualityMetrics: {
    hasReadme: true,
    readmeScore: 65,
    hasTypescript: true,
    hasTests: false,
    hasCi: false,
    framework: "express",
  },
  securityMetrics: {
    possibleSecretCount: 1,
    hasSecurityMd: false,
    hasLicense: true,
    hasLockfile: false,
  },
};
