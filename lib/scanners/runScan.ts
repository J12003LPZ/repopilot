import {
  fetchRepoOverview,
  fetchCommitDates,
  fetchOpenIssues,
  fetchOpenPullRequests,
  fetchContributorCount,
} from "@/lib/github/fetchRepoData";
import { downloadAndExtract } from "@/lib/github/downloadTarball";
import { computeActivityMetrics } from "@/lib/scanners/activityScanner";
import { scanQuality, type PackageJson } from "@/lib/scanners/qualityScanner";
import { scanSecurity } from "@/lib/scanners/securityScanner";
import { scanReadme } from "@/lib/scanners/readmeScanner";
import {
  calculateActivityScore,
  calculateSecurityScore,
  calculateOverallScore,
} from "@/lib/scanners/scoring";
import { getRoadmap } from "@/lib/ai/cloudflareRoadmap";
import {
  updateScanStatus,
  saveFindings,
  saveRepoMetrics,
  saveQualityMetrics,
  saveSecurityMetrics,
} from "@/lib/db/queries";
import type { Finding, Scores } from "@/lib/types";

export async function runScan(input: {
  scanId: string;
  owner: string;
  name: string;
}): Promise<void> {
  const { scanId, owner, name } = input;
  const repoName = `${owner}/${name}`;
  const now = new Date();
  const allFindings: Finding[] = [];

  await updateScanStatus(scanId, "running", { startedAt: now });

  // 1. GitHub metadata — if this fails, the whole scan fails.
  let overview;
  try {
    overview = await fetchRepoOverview(owner, name);
  } catch (err) {
    await updateScanStatus(scanId, "failed", {
      errorMessage:
        err instanceof Error ? err.message : "Failed to fetch repository metadata",
      completedAt: new Date(),
    });
    return;
  }

  // 2. Activity (commits/issues/PRs/contributors).
  let activityScore = 0;
  try {
    const [commits, issues, prs, contributorCount] = await Promise.all([
      fetchCommitDates(owner, name),
      fetchOpenIssues(owner, name),
      fetchOpenPullRequests(owner, name),
      fetchContributorCount(owner, name),
    ]);
    const activity = computeActivityMetrics({
      now,
      commits,
      issues,
      pullRequests: prs,
      contributorCount,
    });
    allFindings.push(...activity.findings);
    activityScore = calculateActivityScore({
      commits30d: activity.metrics.commits30d,
      daysSinceLastCommit: activity.metrics.daysSinceLastCommit,
      staleIssues: activity.metrics.staleIssues,
      stalePrs: activity.metrics.stalePrs,
    });
    await saveRepoMetrics(scanId, {
      commits30d: activity.metrics.commits30d,
      commits90d: activity.metrics.commits90d,
      openIssues: activity.metrics.openIssues,
      openPrs: activity.metrics.openPrs,
      staleIssues: activity.metrics.staleIssues,
      stalePrs: activity.metrics.stalePrs,
      avgIssueAgeDays: String(activity.metrics.avgIssueAgeDays),
      avgPrAgeDays: String(activity.metrics.avgPrAgeDays),
      oldestIssueDays: activity.metrics.oldestIssueDays,
      oldestPrDays: activity.metrics.oldestPrDays,
      contributorCount: activity.metrics.contributorCount,
      metadata: { status: activity.metrics.status },
    });
  } catch (err) {
    allFindings.push({
      category: "activity",
      severity: "info",
      title: "Activity data unavailable",
      description: "Could not fetch full activity data from GitHub.",
      recommendation: "This is often a transient rate-limit; re-run the scan later.",
      metadata: { error: err instanceof Error ? err.message : String(err) },
    });
  }

  // 3. Static analysis from tarball.
  let qualityScore = 0;
  let readmeScore = 0;
  let securityScore = 0;
  try {
    const extracted = await downloadAndExtract(owner, name, overview.defaultBranch);

    let pkg: PackageJson = null;
    if (extracted.fileContents["package.json"]) {
      try {
        pkg = JSON.parse(extracted.fileContents["package.json"]);
      } catch {
        pkg = null;
      }
    }

    const readme = scanReadme(extracted.fileContents["readme.md"] ?? null);
    readmeScore = readme.score;
    allFindings.push(...readme.findings);

    const quality = scanQuality({ files: extracted.files, packageJson: pkg });
    qualityScore = quality.score;
    allFindings.push(...quality.findings);
    await saveQualityMetrics(scanId, {
      hasReadme: quality.metrics.hasReadme,
      readmeScore: readme.score,
      hasPackageJson: quality.metrics.hasPackageJson,
      hasTypescript: quality.metrics.hasTypescript,
      hasEslint: quality.metrics.hasEslint,
      hasPrettier: quality.metrics.hasPrettier,
      hasTests: quality.metrics.hasTests,
      hasTestScript: quality.metrics.hasTestScript,
      hasLintScript: quality.metrics.hasLintScript,
      hasTypecheckScript: quality.metrics.hasTypecheckScript,
      hasCi: quality.metrics.hasCi,
      hasEnvExample: quality.metrics.hasEnvExample,
      packageManager: pkg?.packageManager ?? null,
      framework: quality.metrics.framework,
    });

    const security = scanSecurity({
      files: extracted.files,
      fileContents: extracted.fileContents,
    });
    allFindings.push(...security.findings);
    securityScore = calculateSecurityScore({
      possibleSecrets: security.metrics.possibleSecretCount,
      criticalVulnerabilities: 0,
      highVulnerabilities: 0,
      hasSecurityMd: security.metrics.hasSecurityMd,
      hasLockfile: security.metrics.hasLockfile,
      hasLicense: security.metrics.hasLicense,
    });
    await saveSecurityMetrics(scanId, {
      possibleSecretCount: security.metrics.possibleSecretCount,
      hasSecurityMd: security.metrics.hasSecurityMd,
      hasLicense: security.metrics.hasLicense,
      hasLockfile: security.metrics.hasLockfile,
    });
  } catch (err) {
    allFindings.push({
      category: "quality",
      severity: "info",
      title: "Static analysis incomplete",
      description: "Could not download or analyze the repository archive.",
      recommendation: "Large repositories may exceed limits; results are partial.",
      metadata: { error: err instanceof Error ? err.message : String(err) },
    });
  }

  // 4. Scores + roadmap.
  const documentationScore = readmeScore;
  const overall = calculateOverallScore({
    activity: activityScore,
    quality: qualityScore,
    security: securityScore,
    documentation: documentationScore,
  });
  const scores: Scores = {
    overall,
    activity: activityScore,
    quality: qualityScore,
    security: securityScore,
    performance: null,
    accessibility: null,
  };

  await saveFindings(scanId, allFindings);

  const roadmap = await getRoadmap({ repoName, scores, findings: allFindings });

  await updateScanStatus(scanId, "complete", {
    completedAt: new Date(),
    overallScore: overall,
    activityScore,
    qualityScore,
    securityScore,
    aiSummary: roadmap.executiveSummary,
    roadmap,
  });
}
