export type FindingCategory =
  | "activity"
  | "quality"
  | "security"
  | "performance"
  | "accessibility"
  | "documentation"
  | "maintainability";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type Finding = {
  category: FindingCategory;
  severity: Severity;
  title: string;
  description: string;
  recommendation: string;
  source?: string;
  metadata?: Record<string, unknown>;
};

export type ScanStatus = "queued" | "running" | "complete" | "failed";

export type Roadmap = {
  executiveSummary: string;
  topRisks: Finding[];
  quickWins: Finding[];
  longTermPlan: string[];
  firstPullRequest: string;
  estimatedImpact: string;
  /** Diagnostics, e.g. `aiStatus: "ok" | "fallback:<reason>" | "disabled:..."`. */
  metadata?: Record<string, unknown>;
};

export type Scores = {
  overall: number;
  activity: number;
  quality: number;
  security: number;
  performance: number | null;
  accessibility: number | null;
};
