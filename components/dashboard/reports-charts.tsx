"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  Funnel,
  FunnelChart,
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

import { formatINR } from "@/lib/format";

const NAVY = "#1B3A6B";
const GOLD = "#C9A84C";
const SLICES = ["#1B3A6B", "#C9A84C", "#3B5A8B", "#E0C878", "#7C8FB0", "#94a3b8"];

function Empty({ label }: { label: string }) {
  return <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">{label}</div>;
}

export function RevenueByFranchiseBar({ data }: { data: { name: string; revenue: number }[] }) {
  if (!data.some((d) => d.revenue !== 0)) return <Empty label="No revenue in this period." />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid vertical={false} stroke="#f3f5f8" strokeOpacity={0.7} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} width={64}
          tickFormatter={(v) => formatINR(v)} />
        <Tooltip formatter={(value) => formatINR(value as number)} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
        <Bar dataKey="revenue" fill={NAVY} radius={[4, 4, 0, 0]} barSize={48} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LeadsBySourceDonut({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return <Empty label="No leads in this period." />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} isAnimationActive={false}>
          {data.map((_, i) => (
            <Cell key={i} fill={SLICES[i % SLICES.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function LeadStatusFunnel({ data }: { data: { name: string; value: number }[] }) {
  if (!data.some((d) => d.value > 0)) return <Empty label="No leads in this period." />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <FunnelChart>
        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
        <Funnel dataKey="value" data={data} isAnimationActive={false}>
          {data.map((_, i) => (
            <Cell key={i} fill={i % 2 === 0 ? NAVY : "#3B5A8B"} />
          ))}
          <LabelList position="right" dataKey="name" stroke="none" fill="#475569" fontSize={12} />
          <LabelList position="left" dataKey="value" stroke="none" fill="#1B3A6B" fontSize={12} fontWeight={600} />
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  );
}

export function RevenueTrend({ data }: { data: { date: string; revenue: number }[] }) {
  if (!data.some((d) => d.revenue !== 0)) return <Empty label="No revenue in this period." />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
            <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#f3f5f8" strokeOpacity={0.7} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} minTickGap={28} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} width={64} tickFormatter={(v) => formatINR(v)} />
        <Tooltip formatter={(value) => formatINR(value as number)} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
        <Area type="monotone" dataKey="revenue" stroke={GOLD} strokeWidth={2} fill="url(#revFill)" isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
