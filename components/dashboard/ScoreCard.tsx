import { Card } from "@/components/ui/Card";
import { ScoreBar } from "@/components/ui/Progress";

export function ScoreCard({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  if (value === null) {
    return (
      <Card className="opacity-60">
        <h3 className="font-mono text-xs uppercase tracking-wide text-text-secondary">
          {label}
        </h3>
        <p className="mt-2 text-sm text-text-muted">Not run</p>
      </Card>
    );
  }
  const color =
    value >= 80 ? "text-success" : value >= 60 ? "text-warning" : "text-danger";
  return (
    <Card>
      <h3 className="font-mono text-xs uppercase tracking-wide text-text-secondary">
        {label}
      </h3>
      <div className={`mt-1 text-3xl font-semibold ${color}`}>{value}</div>
      <div className="mt-3">
        <ScoreBar value={value} />
      </div>
    </Card>
  );
}
