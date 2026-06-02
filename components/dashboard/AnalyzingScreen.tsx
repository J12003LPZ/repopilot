"use client";

import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";

const STAGES = [
  "Validating repository",
  "Fetching GitHub metadata",
  "Downloading & analyzing code",
  "Scoring & generating roadmap",
];

export function AnalyzingScreen({ status }: { status: string }) {
  return (
    <div className="max-w-2xl mx-auto py-12">
      <Card>
        <div className="flex items-center gap-3 mb-2">
          <Loader2 className="h-5 w-5 animate-spin text-accent-blue" />
          <h1 className="text-xl font-semibold text-text-primary">
            Analyzing Repository
          </h1>
        </div>
        <p className="text-sm text-text-secondary mb-6">
          This usually takes less than a minute for small repositories.
        </p>
        <div className="flex flex-col gap-3">
          {STAGES.map((stage) => (
            <div key={stage} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-blue/60 shrink-0" />
              <span className="font-mono text-xs text-text-muted">{stage}</span>
            </div>
          ))}
        </div>
        <p className="mt-6 font-mono text-xs text-text-muted">
          Status: {status}
        </p>
      </Card>
    </div>
  );
}
