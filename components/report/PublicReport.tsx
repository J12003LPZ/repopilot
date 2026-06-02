/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
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

export function PublicReport({ data }: Props) {
  const { scan, repo, securityMetrics } = data;
  const roadmap = scan.roadmap as {
    executiveSummary?: string;
    topRisks?: any[];
    quickWins?: any[];
    longTermPlan?: string[];
    firstPullRequest?: string;
    estimatedImpact?: string;
  } | null;

  const overallScore: number = scan.overallScore ?? 0;

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
          <Link
            href={`/scan/${scan.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-transparent px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-card-hover hover:text-text-primary"
          >
            View Technical Dashboard
          </Link>
          <CopyLinkButton />
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

        {/* Top 5 Engineering Risks */}
        <h2 className="text-xl font-semibold mt-10 mb-3">
          Top Engineering Risks
        </h2>
        <FindingsTable findings={roadmap?.topRisks ?? []} />

        {/* Quick Wins */}
        <h2 className="text-xl font-semibold mt-10 mb-3">Quick Wins</h2>
        <FindingsTable findings={roadmap?.quickWins ?? []} />

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

        {/* Suggested First Pull Request */}
        {roadmap?.firstPullRequest && (
          <>
            <h2 className="text-xl font-semibold mt-10 mb-3">
              Suggested First Pull Request
            </h2>
            <Card className="mb-6">
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                {roadmap.firstPullRequest}
              </p>
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
