import type { Finding } from "@/lib/types";
import { findSecrets } from "@/lib/utils/maskSecrets";

export type SecurityMetrics = {
  possibleSecretCount: number;
  hasSecurityMd: boolean;
  hasLicense: boolean;
  hasLockfile: boolean;
};

export type SecurityScanResult = {
  metrics: SecurityMetrics;
  findings: Finding[];
};

const LOCKFILES = [
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "npm-shrinkwrap.json",
];

export function scanSecurity(input: {
  files: string[];
  fileContents: Record<string, string>;
}): SecurityScanResult {
  const lower = input.files.map((f) => f.toLowerCase());
  const findings: Finding[] = [];

  const hasLockfile = lower.some((f) =>
    LOCKFILES.includes(f.split("/").pop() ?? "")
  );
  const hasLicense = lower.some(
    (f) => f === "license" || f.startsWith("license.") || f === "license.md"
  );
  const hasSecurityMd = lower.some((f) => f === "security.md" || f.endsWith("/security.md"));

  let possibleSecretCount = 0;
  for (const [path, content] of Object.entries(input.fileContents)) {
    const hits = findSecrets(content);
    if (hits.length > 0) {
      possibleSecretCount += hits.length;
      findings.push({
        category: "security",
        severity: "critical",
        title: "Possible exposed secret",
        description: `Found ${hits.length} secret-like value(s) in ${path}: ${hits
          .map((h) => `${h.key}=${h.masked}`)
          .join(", ")}.`,
        recommendation:
          "Rotate any real credentials immediately, remove them from version control, and load them from environment variables.",
        source: path,
        metadata: { keys: hits.map((h) => h.key) },
      });
    }
    if (path.toLowerCase().split("/").pop() === ".env") {
      findings.push({
        category: "security",
        severity: "critical",
        title: "Committed .env file",
        description: `A .env file (${path}) appears to be committed to the repository.`,
        recommendation: "Add .env to .gitignore and provide a .env.example instead.",
        source: path,
      });
    }
  }

  if (!hasLockfile) {
    findings.push({
      category: "security",
      severity: "medium",
      title: "Missing dependency lockfile",
      description: "No lockfile (package-lock.json, yarn.lock, pnpm-lock.yaml) was found.",
      recommendation: "Commit a lockfile to ensure reproducible, audited installs.",
    });
  }
  if (!hasLicense) {
    findings.push({
      category: "documentation",
      severity: "low",
      title: "Missing license",
      description: "No LICENSE file was found.",
      recommendation: "Add a LICENSE file to clarify how others may use the project.",
    });
  }
  if (!hasSecurityMd) {
    findings.push({
      category: "security",
      severity: "low",
      title: "Missing SECURITY.md",
      description: "No security policy file was found.",
      recommendation: "Add a SECURITY.md describing how to report vulnerabilities.",
    });
  }

  return {
    metrics: { possibleSecretCount, hasSecurityMd, hasLicense, hasLockfile },
    findings,
  };
}
