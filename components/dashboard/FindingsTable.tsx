import { SeverityBadge } from "@/components/ui/Badge";
import type { Finding } from "@/lib/types";

export function FindingsTable({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) {
    return (
      <p className="py-6 text-sm text-text-muted">No findings in this category.</p>
    );
  }
  return (
    <div className="divide-y divide-border">
      {findings.map((f, i) => (
        <div key={i} className="flex flex-col gap-1 py-4">
          <div className="flex items-center gap-3">
            <SeverityBadge severity={f.severity} />
            <span className="font-medium text-text-primary">{f.title}</span>
          </div>
          <p className="text-sm text-text-secondary">{f.description}</p>
          <p className="text-sm text-text-muted">
            <span className="text-text-secondary">Fix:</span> {f.recommendation}
          </p>
        </div>
      ))}
    </div>
  );
}
