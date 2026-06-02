import { cn } from "@/lib/cn";

export function ScoreBar({ value }: { value: number }) {
  const color =
    value >= 80 ? "bg-success" : value >= 60 ? "bg-warning" : "bg-danger";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-bright">
      <div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }} />
    </div>
  );
}
