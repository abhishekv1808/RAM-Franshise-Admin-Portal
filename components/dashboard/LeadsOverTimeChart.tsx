"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";

export type TimePoint = { date: string; leads: number; closed: number };

/* Custom branded tooltip */
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[var(--radius-dropdown)] border border-border/40 bg-white/[0.97] px-3.5 py-2.5 shadow-[var(--shadow-lg)] backdrop-blur-sm">
      <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-foreground font-medium">{p.name}</span>
          <span className="ml-auto tabular-nums font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function LeadsOverTimeChart({ data }: { data: TimePoint[] }) {
  const [showLeads, setShowLeads] = useState(true);
  const [showClosed, setShowClosed] = useState(true);

  const empty = data.every((d) => d.leads === 0 && d.closed === 0);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Chip active={showLeads} color="navy" onClick={() => setShowLeads((v) => !v)}>
          Leads
        </Chip>
        <Chip active={showClosed} color="gold" onClick={() => setShowClosed((v) => !v)}>
          Closed
        </Chip>
      </div>

      {empty ? (
        <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
          No activity in this period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
            <defs>
              <linearGradient id="gradNavy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1B3A6B" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#1B3A6B" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="gradGold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C9A84C" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#C9A84C" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#e8ecf2" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              minTickGap={28}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              width={32}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: "#1B3A6B", strokeOpacity: 0.1, strokeWidth: 1 }}
            />
            {showLeads && (
              <Area
                type="monotone"
                dataKey="leads"
                name="Leads"
                stroke="#1B3A6B"
                strokeWidth={2}
                fill="url(#gradNavy)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: "#1B3A6B" }}
                animationDuration={800}
                animationEasing="ease-out"
              />
            )}
            {showClosed && (
              <Area
                type="monotone"
                dataKey="closed"
                name="Closed"
                stroke="#C9A84C"
                strokeWidth={2}
                strokeDasharray="5 4"
                fill="url(#gradGold)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: "#C9A84C" }}
                animationDuration={800}
                animationEasing="ease-out"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function Chip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color: "navy" | "gold";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-[var(--transition-fast)]",
        active
          ? "border-border/60 bg-white text-foreground shadow-[var(--shadow-xs)]"
          : "border-transparent bg-muted/60 text-muted-foreground hover:bg-muted"
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full transition-opacity duration-[var(--transition-fast)]",
          color === "navy" ? "bg-brand-navy" : "bg-brand-gold",
          !active && "opacity-40"
        )}
      />
      {children}
    </button>
  );
}
