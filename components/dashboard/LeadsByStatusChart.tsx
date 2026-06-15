"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

export type StatusDatum = { label: string; count: number; key: string };

// Completed/Closed read as "won/done" -> gold; active pipeline -> navy.
const GOLD = new Set(["completed", "closed"]);

export function LeadsByStatusChart({ data }: { data: StatusDatum[] }) {
  const empty = data.every((d) => d.count === 0);
  if (empty) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        No leads yet.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 28, bottom: 4, left: 8 }}>
        <XAxis type="number" hide domain={[0, "dataMax"]} />
        <YAxis
          type="category"
          dataKey="label"
          width={132}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "#64748b" }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.key} fill={GOLD.has(d.key) ? "#C9A84C" : "#1B3A6B"} />
          ))}
          <LabelList
            dataKey="count"
            position="right"
            style={{ fontSize: 12, fontWeight: 600, fill: "#1B3A6B" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
