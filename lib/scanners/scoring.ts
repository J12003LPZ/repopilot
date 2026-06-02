function clamp(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getActivityStatus(daysSinceLastCommit: number): string {
  if (daysSinceLastCommit <= 7) return "Active";
  if (daysSinceLastCommit <= 30) return "Moderately active";
  if (daysSinceLastCommit <= 90) return "Stale";
  return "Inactive";
}

export function calculateActivityScore(input: {
  commits30d: number;
  daysSinceLastCommit: number;
  staleIssues: number;
  stalePrs: number;
}): number {
  let score = 100;
  if (input.commits30d === 0) score -= 25;
  if (input.daysSinceLastCommit > 30) score -= 25;
  if (input.daysSinceLastCommit > 90) score -= 25;
  score -= input.staleIssues * 2;
  score -= input.stalePrs * 5;
  return clamp(score);
}

export function calculateQualityScore(input: {
  hasReadme: boolean;
  hasTypescript: boolean;
  hasTests: boolean;
  hasLintScript: boolean;
  hasTypecheckScript: boolean;
  hasCI: boolean;
  hasEnvExample: boolean;
}): number {
  let score = 100;
  if (!input.hasReadme) score -= 15;
  if (!input.hasTypescript) score -= 15;
  if (!input.hasTests) score -= 20;
  if (!input.hasLintScript) score -= 10;
  if (!input.hasTypecheckScript) score -= 10;
  if (!input.hasCI) score -= 20;
  if (!input.hasEnvExample) score -= 10;
  return clamp(score);
}

export function calculateSecurityScore(input: {
  possibleSecrets: number;
  criticalVulnerabilities: number;
  highVulnerabilities: number;
  hasSecurityMd: boolean;
  hasLockfile: boolean;
  hasLicense: boolean;
}): number {
  let score = 100;
  score -= input.possibleSecrets * 20;
  score -= input.criticalVulnerabilities * 25;
  score -= input.highVulnerabilities * 15;
  if (!input.hasSecurityMd) score -= 10;
  if (!input.hasLockfile) score -= 10;
  if (!input.hasLicense) score -= 5;
  return clamp(score);
}

export function calculatePRBottleneckScore(
  avgPrAgeDays: number,
  stalePrCount: number
): number {
  let score = 100;
  score -= avgPrAgeDays * 3;
  score -= stalePrCount * 8;
  return clamp(score);
}

export function calculateReadmeScore(readme: string): number {
  let score = 0;
  if (readme.length > 300) score += 20;
  if (/install|setup/i.test(readme)) score += 15;
  if (/usage|how to use/i.test(readme)) score += 15;
  if (/env|environment/i.test(readme)) score += 15;
  if (/screenshot|demo/i.test(readme)) score += 15;
  if (/license/i.test(readme)) score += 10;
  if (/tech stack|built with/i.test(readme)) score += 10;
  return Math.min(score, 100);
}

export function calculateOverallScore(input: {
  activity: number;
  quality: number;
  security: number;
  documentation: number;
}): number {
  return clamp(
    input.activity * 0.3 +
      input.quality * 0.35 +
      input.security * 0.25 +
      input.documentation * 0.1
  );
}
