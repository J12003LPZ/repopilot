import type { getScanById } from "@/lib/db/queries";

type ScanPayload = NonNullable<Awaited<ReturnType<typeof getScanById>>>;
type ScanRow = ScanPayload["scan"];

function baseScan(scan: ScanRow) {
  return {
    id: scan.id,
    status: scan.status,
    errorMessage: scan.errorMessage,
    overallScore: scan.overallScore,
    activityScore: scan.activityScore,
    qualityScore: scan.qualityScore,
    securityScore: scan.securityScore,
    performanceScore: scan.performanceScore,
    accessibilityScore: scan.accessibilityScore,
    aiSummary: scan.aiSummary,
    roadmap: scan.roadmap,
    publicId: scan.publicId,
    deployedUrl: scan.deployedUrl,
    startedAt: scan.startedAt,
    completedAt: scan.completedAt,
    expiresAt: scan.expiresAt,
    createdAt: scan.createdAt,
  };
}

export function toPrivateScanPayload(payload: ScanPayload) {
  return { ...payload, scan: baseScan(payload.scan) };
}

export function toPublicReportPayload(payload: ScanPayload) {
  return {
    scan: {
      status: payload.scan.status,
      overallScore: payload.scan.overallScore,
      activityScore: payload.scan.activityScore,
      qualityScore: payload.scan.qualityScore,
      securityScore: payload.scan.securityScore,
      aiSummary: payload.scan.aiSummary,
      roadmap: payload.scan.roadmap,
      publicId: payload.scan.publicId,
      completedAt: payload.scan.completedAt,
      createdAt: payload.scan.createdAt,
    },
    repo: payload.repo,
    findings: payload.findings,
    repoMetrics: payload.repoMetrics,
    qualityMetrics: payload.qualityMetrics,
    securityMetrics: payload.securityMetrics,
  };
}
