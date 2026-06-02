"use client";

import { useState, useEffect } from "react";
import type { ScanPayload } from "@/lib/useScanPolling";
import type { Finding } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScoreBar } from "@/components/ui/Progress";
import { ScoreCard } from "@/components/dashboard/ScoreCard";
import { FindingsTable } from "@/components/dashboard/FindingsTable";
import { RoadmapPanel } from "@/components/dashboard/RoadmapPanel";
import { ReportShareButton } from "@/components/dashboard/ReportShareButton";
import { ActivityChart } from "@/components/dashboard/ActivityChart";

type Tab = "overview" | "activity" | "quality" | "security" | "roadmap";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "activity", label: "Activity" },
  { id: "quality", label: "Code Quality" },
  { id: "security", label: "Security" },
  { id: "roadmap", label: "AI Roadmap" },
];

export function ScanDashboard({ data }: { data: ScanPayload }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasToken(Boolean(localStorage.getItem(`repopilot-scan-token-${data.scan.id}`)));
  }, [data.scan.id]);

  async function handleRunAgain() {
    const token = localStorage.getItem(`repopilot-scan-token-${data.scan.id}`);
    if (!token) return;
    await fetch(`/api/scans/${data.scan.id}/rerun`, {
      method: "POST",
      headers: { "x-scan-token": token },
    });
    location.reload();
  }

  const score = data.scan.overallScore ?? 0;
  const scoreColor =
    score >= 80 ? "text-success" : score >= 60 ? "text-warning" : "text-danger";

  const topRisks: Finding[] = data.scan.roadmap?.topRisks ?? [];
  const findings: Finding[] = data.findings as Finding[];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            {data.repo?.githubOwner}/{data.repo?.githubName}
          </h1>
          {data.repo?.description && (
            <p className="mt-1 text-sm text-text-muted">{data.repo.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-xs text-text-secondary">
            <span>&#9733; {data.repo?.stars ?? 0}</span>
            <span>&#9322; {data.repo?.forks ?? 0}</span>
            {data.repo?.primaryLanguage && (
              <span>{data.repo.primaryLanguage}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ReportShareButton publicId={data.scan.publicId} />
          <Button
            variant="ghost"
            disabled={!hasToken}
            onClick={handleRunAgain}
          >
            Run Again
          </Button>
        </div>
      </div>

      {/* Overall Health */}
      <Card>
        <p className="font-mono text-xs uppercase tracking-wide text-text-secondary">
          Overall Health
        </p>
        <div className="mt-1 flex items-baseline gap-1">
          <span className={`text-5xl font-semibold ${scoreColor}`}>{score}</span>
          <span className="text-lg text-text-muted">/100</span>
        </div>
        <div className="mt-3">
          <ScoreBar value={score} />
        </div>
      </Card>

      {/* Score Cards Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <ScoreCard label="Activity" value={data.scan.activityScore} />
        <ScoreCard label="Quality" value={data.scan.qualityScore} />
        <ScoreCard label="Security" value={data.scan.securityScore} />
        <ScoreCard label="Performance" value={null} />
        <ScoreCard label="Accessibility" value={null} />
      </div>

      {/* Tab Bar */}
      <div className="border-b border-border">
        <div className="flex gap-4">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={
                tab === id
                  ? "border-b-2 border-accent-blue pb-2 text-sm font-medium text-text-primary"
                  : "pb-2 text-sm font-medium text-text-secondary hover:text-text-primary"
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <div className="flex flex-col gap-4">
          {data.scan.roadmap?.executiveSummary && (
            <Card>
              <p className="font-mono text-xs uppercase tracking-wide text-text-secondary mb-2">
                Executive Summary
              </p>
              <p className="text-sm text-text-primary">
                {data.scan.roadmap.executiveSummary}
              </p>
            </Card>
          )}
          <Card>
            <p className="font-mono text-xs uppercase tracking-wide text-text-secondary mb-2">
              Top Risks
            </p>
            <FindingsTable findings={topRisks} />
          </Card>
        </div>
      )}

      {tab === "activity" && (
        <div className="flex flex-col gap-4">
          <Card>
            <ActivityChart
              commits30d={data.repoMetrics?.commits30d ?? null}
              commits90d={data.repoMetrics?.commits90d ?? null}
            />
          </Card>
          <Card>
            <FindingsTable
              findings={findings.filter(
                (f: Finding) =>
                  f.category === "activity" || f.category === "maintainability"
              )}
            />
          </Card>
        </div>
      )}

      {tab === "quality" && (
        <Card>
          <FindingsTable
            findings={findings.filter(
              (f: Finding) =>
                f.category === "quality" || f.category === "documentation"
            )}
          />
        </Card>
      )}

      {tab === "security" && (
        <Card>
          <FindingsTable
            findings={findings.filter((f: Finding) => f.category === "security")}
          />
        </Card>
      )}

      {tab === "roadmap" && (
        <>
          {data.scan.roadmap ? (
            <RoadmapPanel roadmap={data.scan.roadmap} />
          ) : (
            <p className="text-sm text-text-muted">Roadmap not available.</p>
          )}
        </>
      )}
    </div>
  );
}
