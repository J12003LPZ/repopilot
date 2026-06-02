import { cn } from "@/lib/cn";
import type { Severity } from "@/lib/types";

const STYLES: Record<Severity, string> = {
  critical: "bg-danger/10 text-danger",
  high: "bg-danger/10 text-danger",
  medium: "bg-warning/10 text-warning",
  low: "bg-primary/10 text-primary",
  info: "bg-text-muted/10 text-text-muted",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 font-mono text-xs uppercase tracking-wide",
        STYLES[severity]
      )}
    >
      {severity}
    </span>
  );
}
