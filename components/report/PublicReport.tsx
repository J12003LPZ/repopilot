/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card } from "@/components/ui/Card";
import { ScoreBar } from "@/components/ui/Progress";
import { FindingsTable } from "@/components/dashboard/FindingsTable";
import { PrintButton } from "@/components/report/PrintButton";
import { CopyLinkButton } from "@/components/report/CopyLinkButton";

type Props = {
  data: {
    scan: any;
    repo: any;
    findings: any[];
    repoMetrics: any;
    qualityMetrics: any;
    securityMetrics: any;
  };
};

function scoreColor(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-danger";
}

const SEVERITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

export function PublicReport({ data }: Props) {
  const { scan, repo, findings: allFindings, repoMetrics, securityMetrics } = data;
  const roadmap = scan.roadmap as {
    executiveSummary?: string;
    topRisks?: any[];
    quickWins?: any[];
    longTermPlan?: string[];
    firstPullRequest?: string;
    estimatedImpact?: string;
  } | null;

  const overallScore: number = scan.overallScore ?? 0;
  const snapshot = [
    { label: "Language", value: repo?.primaryLanguage ?? "Unknown" },
    { label: "Stars", value: repo?.stars ?? 0 },
    { label: "Forks", value: repo?.forks ?? 0 },
    { label: "Commits 30d", value: repoMetrics?.commits30d ?? 0 },
    { label: "Open Issues", value: repoMetrics?.openIssues ?? 0 },
    { label: "Open PRs", value: repoMetrics?.openPrs ?? 0 },
  ];

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <p className="text-xs font-mono tracking-widest text-text-muted uppercase mb-2">
          RepoPilot Report
        </p>
        <h1 className="text-3xl font-semibold mb-1">
          {repo?.githubOwner}/{repo?.githubName}
        </h1>
        {repo?.description && (
          <p className="text-text-muted text-sm mb-4">{repo.description}</p>
        )}

        {/* Action row — hidden when printing */}
        <div className="flex flex-wrap gap-2 mb-10 print:hidden">
          <PrintButton />
          <CopyLinkButton />
        </div>

        <h2 className="text-xl font-semibold mt-10 mb-3">
          Repository Snapshot
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-6">
          {snapshot.map(({ label, value }) => (
            <div key={label} className="border border-border bg-card px-4 py-3">
              <p className="text-xs font-mono uppercase tracking-wider text-text-muted">
                {label}
              </p>
              <p className="mt-1 text-lg font-semibold text-text-primary">
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Overall Health */}
        <h2 className="text-xl font-semibold mt-10 mb-3">Overall Health</h2>
        <Card className="mb-6">
          <div className="flex items-baseline gap-2 mb-3">
            <span className={`text-5xl font-bold ${scoreColor(overallScore)}`}>
              {overallScore}
            </span>
            <span className="text-text-muted text-lg">/100</span>
          </div>
          <ScoreBar value={overallScore} />
          <p className="mt-2 text-sm text-text-secondary">
            Composite score across activity, quality, and security signals.
          </p>
        </Card>

        {/* Score Breakdown */}
        <h2 className="text-xl font-semibold mt-10 mb-3">Score Breakdown</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Activity", value: scan.activityScore ?? 0 },
            { label: "Quality", value: scan.qualityScore ?? 0 },
            { label: "Security", value: scan.securityScore ?? 0 },
            { label: "Overall", value: overallScore },
          ].map(({ label, value }) => (
            <Card key={label} className="flex flex-col gap-1">
              <span className="text-xs font-mono text-text-muted uppercase tracking-wider">
                {label}
              </span>
              <span className={`text-2xl font-semibold ${scoreColor(value)}`}>
                {value}
              </span>
            </Card>
          ))}
        </div>

        {roadmap?.firstPullRequest && (
          <>
            <h2 className="text-xl font-semibold mt-10 mb-3">
              What To Fix Next
            </h2>
            <Card className="mb-6">
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                {roadmap.firstPullRequest}
              </p>
            </Card>
          </>
        )}

        {/* Executive Summary */}
        {(scan.aiSummary ?? roadmap?.executiveSummary) && (
          <>
            <h2 className="text-xl font-semibold mt-10 mb-3">
              Executive Summary
            </h2>
            <Card className="mb-6">
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                {scan.aiSummary ?? roadmap?.executiveSummary}
              </p>
            </Card>
          </>
        )}

        {/* Top Engineering Risks — all critical/high findings from the scan */}
        <h2 className="text-xl font-semibold mt-10 mb-3">
          Top Engineering Risks
        </h2>
        <FindingsTable
          findings={[...allFindings]
            .filter((f) => f.severity === "critical" || f.severity === "high")
            .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])}
        />

        {/* Quick Wins — medium/low findings */}
        <h2 className="text-xl font-semibold mt-10 mb-3">Quick Wins</h2>
        <FindingsTable
          findings={[...allFindings]
            .filter((f) => f.severity === "medium" || f.severity === "low")
            .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])}
        />

        {/* Long-Term Plan */}
        {roadmap?.longTermPlan && roadmap.longTermPlan.length > 0 && (
          <>
            <h2 className="text-xl font-semibold mt-10 mb-3">
              Long-Term Plan
            </h2>
            <ul className="list-disc pl-5 text-sm text-text-secondary space-y-1 mb-6">
              {roadmap.longTermPlan.map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </>
        )}

        {/* Security Signals */}
        {securityMetrics && (
          <>
            <h2 className="text-xl font-semibold mt-10 mb-3">
              Security Signals
            </h2>
            <Card className="mb-6">
              <ul className="text-sm text-text-secondary space-y-1">
                {securityMetrics.possibleSecretCount != null && (
                  <li>
                    Possible secrets:{" "}
                    <span className="text-text-primary font-medium">
                      {securityMetrics.possibleSecretCount}
                    </span>
                  </li>
                )}
                {securityMetrics.hasLockfile != null && (
                  <li>
                    Lockfile present:{" "}
                    <span className="text-text-primary font-medium">
                      {securityMetrics.hasLockfile ? "Yes" : "No"}
                    </span>
                  </li>
                )}
                {securityMetrics.hasLicense != null && (
                  <li>
                    License present:{" "}
                    <span className="text-text-primary font-medium">
                      {securityMetrics.hasLicense ? "Yes" : "No"}
                    </span>
                  </li>
                )}
                {securityMetrics.hasSecurityMd != null && (
                  <li>
                    SECURITY.md:{" "}
                    <span className="text-text-primary font-medium">
                      {securityMetrics.hasSecurityMd ? "Present" : "Not found"}
                    </span>
                  </li>
                )}
              </ul>
            </Card>
          </>
        )}

        {/* Estimated Impact */}
        {roadmap?.estimatedImpact && (
          <>
            <h2 className="text-xl font-semibold mt-10 mb-3">
              Estimated Impact
            </h2>
            <Card className="mb-6">
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                {roadmap.estimatedImpact}
              </p>
            </Card>
          </>
        )}

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-border text-xs text-text-muted text-center">
          Generated by RepoPilot &mdash; {new Date(scan.completedAt ?? scan.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
