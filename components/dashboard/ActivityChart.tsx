"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

export function ActivityChart({
  commits30d,
  commits90d,
}: {
  commits30d: number | null;
  commits90d: number | null;
}) {
  if (commits30d === null && commits90d === null) {
    return <p className="text-sm text-text-muted">No activity data available.</p>;
  }
  const data = [
    { window: "30d", commits: commits30d ?? 0 },
    { window: "90d", commits: commits90d ?? 0 },
  ];
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="#1e293b" vertical={false} />
          <XAxis dataKey="window" stroke="#64748b" fontSize={12} />
          <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
          <Bar dataKey="commits" fill="#4d8eff" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
