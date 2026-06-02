import { Card } from "@/components/ui/Card";
import { FindingsTable } from "@/components/dashboard/FindingsTable";
import type { Roadmap } from "@/lib/types";

export function RoadmapPanel({ roadmap }: { roadmap: Roadmap }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h3 className="font-mono text-xs uppercase tracking-wide text-text-secondary">
          Executive Summary
        </h3>
        <p className="mt-2 text-sm text-text-primary">{roadmap.executiveSummary}</p>
      </Card>
      <Card>
        <h3 className="mb-2 font-mono text-xs uppercase tracking-wide text-text-secondary">
          Top Risks
        </h3>
        <FindingsTable findings={roadmap.topRisks} />
      </Card>
      <Card>
        <h3 className="mb-2 font-mono text-xs uppercase tracking-wide text-text-secondary">
          Quick Wins
        </h3>
        <FindingsTable findings={roadmap.quickWins} />
      </Card>
      <Card>
        <h3 className="mb-2 font-mono text-xs uppercase tracking-wide text-text-secondary">
          Long-Term Plan
        </h3>
        <ul className="list-disc pl-5 text-sm text-text-secondary">
          {roadmap.longTermPlan.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </Card>
      <Card>
        <h3 className="font-mono text-xs uppercase tracking-wide text-text-secondary">
          Suggested First Pull Request
        </h3>
        <p className="mt-2 text-sm text-text-primary">{roadmap.firstPullRequest}</p>
        <h3 className="mt-4 font-mono text-xs uppercase tracking-wide text-text-secondary">
          Estimated Impact
        </h3>
        <p className="mt-2 text-sm text-text-primary">{roadmap.estimatedImpact}</p>
      </Card>
    </div>
  );
}
