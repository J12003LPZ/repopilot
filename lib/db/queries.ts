import { and, eq, gt, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  repositories,
  scans,
  scanFindings,
  repoMetrics,
  qualityMetrics,
  securityMetrics,
  scanJobs,
} from "@/db/schema";
import type { Finding } from "@/lib/types";

export async function countRecentScansByIp(
  ipHash: string,
  sinceIso: string
): Promise<{ recent: number; active: number }> {
  const recentRows = await db
    .select({ id: scans.id, status: scans.status })
    .from(scans)
    .where(and(eq(scans.ipHash, ipHash), gte(scans.createdAt, new Date(sinceIso))));
  const recent = recentRows.length;
  const active = recentRows.filter(
    (r) => r.status === "queued" || r.status === "running"
  ).length;
  return { recent, active };
}

export async function insertRepository(input: {
  owner: string;
  name: string;
  url: string;
}): Promise<string> {
  const [row] = await db
    .insert(repositories)
    .values({
      githubOwner: input.owner,
      githubName: input.name,
      githubUrl: input.url,
    })
    .returning({ id: repositories.id });
  return row.id;
}

export async function insertScan(input: {
  repositoryId: string;
  deployedUrl?: string;
  publicId: string;
  scanToken: string;
  ipHash: string;
  userAgent: string;
  expiresAt: Date;
}): Promise<string> {
  const [row] = await db
    .insert(scans)
    .values({
      repositoryId: input.repositoryId,
      deployedUrl: input.deployedUrl,
      publicId: input.publicId,
      scanToken: input.scanToken,
      ipHash: input.ipHash,
      userAgent: input.userAgent,
      status: "queued",
      expiresAt: input.expiresAt,
    })
    .returning({ id: scans.id });
  await db.insert(scanJobs).values({ scanId: row.id, status: "queued" });
  return row.id;
}

export async function insertScanWithRateLimit(input: {
  repository: {
    owner: string;
    name: string;
    url: string;
  };
  scan: {
    deployedUrl?: string;
    publicId: string;
    scanToken: string;
    ipHash: string;
    userAgent: string;
    expiresAt: Date;
  };
  rateLimit: {
    since: Date;
    hourlyLimit: number;
    activeLimit: number;
  };
}): Promise<
  | { allowed: true; scanId: string }
  | { allowed: false; reason: "hourly_limit" | "active_limit" }
> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${input.scan.ipHash})::bigint)`
    );

    const recentRows = await tx
      .select({ id: scans.id, status: scans.status })
      .from(scans)
      .where(
        and(
          eq(scans.ipHash, input.scan.ipHash),
          gte(scans.createdAt, input.rateLimit.since)
        )
      );
    const active = recentRows.filter(
      (r) => r.status === "queued" || r.status === "running"
    ).length;
    if (active >= input.rateLimit.activeLimit) {
      return { allowed: false, reason: "active_limit" };
    }
    if (recentRows.length >= input.rateLimit.hourlyLimit) {
      return { allowed: false, reason: "hourly_limit" };
    }

    const [repository] = await tx
      .insert(repositories)
      .values({
        githubOwner: input.repository.owner,
        githubName: input.repository.name,
        githubUrl: input.repository.url,
      })
      .returning({ id: repositories.id });
    const [scan] = await tx
      .insert(scans)
      .values({
        repositoryId: repository.id,
        deployedUrl: input.scan.deployedUrl,
        publicId: input.scan.publicId,
        scanToken: input.scan.scanToken,
        ipHash: input.scan.ipHash,
        userAgent: input.scan.userAgent,
        status: "queued",
        expiresAt: input.scan.expiresAt,
      })
      .returning({ id: scans.id });
    await tx.insert(scanJobs).values({ scanId: scan.id, status: "queued" });

    return { allowed: true, scanId: scan.id };
  });
}

export async function updateScanStatus(
  scanId: string,
  status: string,
  patch: Partial<{
    errorMessage: string;
    startedAt: Date;
    completedAt: Date;
    overallScore: number;
    activityScore: number;
    qualityScore: number;
    securityScore: number;
    aiSummary: string;
    roadmap: unknown;
  }> = {}
): Promise<void> {
  await db
    .update(scans)
    .set({ status, ...patch })
    .where(eq(scans.id, scanId));
}

export async function saveFindings(
  scanId: string,
  findings: Finding[]
): Promise<void> {
  if (findings.length === 0) return;
  await db.insert(scanFindings).values(
    findings.map((f) => ({
      scanId,
      category: f.category,
      severity: f.severity,
      title: f.title,
      description: f.description,
      recommendation: f.recommendation,
      source: f.source,
      metadata: f.metadata,
    }))
  );
}

export async function saveRepoMetrics(
  scanId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metrics: any
): Promise<void> {
  await db.insert(repoMetrics).values({ scanId, ...metrics });
}

export async function saveQualityMetrics(
  scanId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  values: any
): Promise<void> {
  await db.insert(qualityMetrics).values({ scanId, ...values });
}

export async function saveSecurityMetrics(
  scanId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  values: any
): Promise<void> {
  await db.insert(securityMetrics).values({ scanId, ...values });
}

export async function getScanById(scanId: string) {
  const [scan] = await db
    .select()
    .from(scans)
    .where(and(eq(scans.id, scanId), gt(scans.expiresAt, new Date())));
  if (!scan) return null;
  const [repo] = scan.repositoryId
    ? await db.select().from(repositories).where(eq(repositories.id, scan.repositoryId))
    : [null];
  const findings = await db
    .select()
    .from(scanFindings)
    .where(eq(scanFindings.scanId, scanId));
  const [rm] = await db.select().from(repoMetrics).where(eq(repoMetrics.scanId, scanId));
  const [qm] = await db
    .select()
    .from(qualityMetrics)
    .where(eq(qualityMetrics.scanId, scanId));
  const [sm] = await db
    .select()
    .from(securityMetrics)
    .where(eq(securityMetrics.scanId, scanId));
  return { scan, repo, findings, repoMetrics: rm, qualityMetrics: qm, securityMetrics: sm };
}

export async function getScanByPublicId(publicId: string) {
  const [scan] = await db
    .select()
    .from(scans)
    .where(and(eq(scans.publicId, publicId), gt(scans.expiresAt, new Date())));
  if (!scan) return null;
  return getScanById(scan.id);
}

export async function getScanToken(scanId: string): Promise<string | null> {
  const [row] = await db
    .select({ token: scans.scanToken })
    .from(scans)
    .where(and(eq(scans.id, scanId), gt(scans.expiresAt, new Date())));
  return row?.token ?? null;
}

export async function deleteScan(scanId: string): Promise<void> {
  await db.delete(scans).where(eq(scans.id, scanId));
}

export async function clearScanChildData(scanId: string): Promise<void> {
  await db.delete(scanFindings).where(eq(scanFindings.scanId, scanId));
  await db.delete(repoMetrics).where(eq(repoMetrics.scanId, scanId));
  await db.delete(qualityMetrics).where(eq(qualityMetrics.scanId, scanId));
  await db.delete(securityMetrics).where(eq(securityMetrics.scanId, scanId));
}
