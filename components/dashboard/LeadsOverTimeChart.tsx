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

/* Custom premium tooltip */
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/30 bg-white px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-sm">
      <p className="mb-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.1em]">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-3 py-1 text-xs">
          <span className="h-2.5 w-2.5 rounded-[4px] shadow-sm" style={{ background: p.color }} />
          <span className="text-muted-foreground font-medium">{p.name}</span>
          <span className="ml-auto tabular-nums text-[13px] font-bold text-foreground">{p.value.toLocaleString("en-IN")}</span>
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
      {/* Controls row */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-xl bg-muted/30 p-1">
          <Chip active={showLeads} color="navy" onClick={() => setShowLeads((v) => !v)}>
            Leads
          </Chip>
          <Chip active={showClosed} color="gold" onClick={() => setShowClosed((v) => !v)}>
            Closed
          </Chip>
        </div>
        <div className="ml-auto flex items-center gap-4 text-[11px] text-muted-foreground/60">
          <span className="flex items-center gap-2">
            <span className="h-[6px] w-3 rounded-full bg-brand-navy" />
            This Period
          </span>
          <span className="flex items-center gap-2">
            <span className="h-[6px] w-3 rounded-full bg-brand-gold opacity-60" />
            Last Period
          </span>
        </div>
      </div>

      {empty ? (
        <div className="flex h-[300px] flex-col items-center justify-center gap-2">
          <div className="h-12 w-12 rounded-2xl bg-muted/40 flex items-center justify-center">
            <svg className="h-5 w-5 text-muted-foreground/40" viewBox="0 0 24 24" fill="none">
              <path d="M3 3V21H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M7 16L12 11L15 14L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground/50 font-medium">No activity in this period</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="gradNavy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1B3A6B" stopOpacity={0.2} />
                <stop offset="50%" stopColor="#1B3A6B" stopOpacity={0.06} />
                <stop offset="100%" stopColor="#1B3A6B" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradGold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C9A84C" stopOpacity={0.18} />
                <stop offset="50%" stopColor="#C9A84C" stopOpacity={0.05} />
                <stop offset="100%" stopColor="#C9A84C" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="#f1f5f9"
              strokeWidth={1}
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
              minTickGap={32}
              dy={8}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
              width={36}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: "#1B3A6B", strokeOpacity: 0.06, strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            {showLeads && (
              <Area
                type="monotone"
                dataKey="leads"
                name="Leads"
                stroke="#1B3A6B"
                strokeWidth={2.5}
                fill="url(#gradNavy)"
                dot={false}
                activeDot={{
                  r: 6, strokeWidth: 3, stroke: "#fff", fill: "#1B3A6B",
                  style: { filter: "drop-shadow(0 2px 4px rgba(27,58,107,0.3))" },
                }}
                animationDuration={1000}
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
                strokeDasharray="6 4"
                fill="url(#gradGold)"
                dot={false}
                activeDot={{
                  r: 5, strokeWidth: 3, stroke: "#fff", fill: "#C9A84C",
                  style: { filter: "drop-shadow(0 2px 4px rgba(201,168,76,0.3))" },
                }}
                animationDuration={1000}
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
        "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200",
        active
          ? "bg-white text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
          : "text-muted-foreground/60 hover:text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "h-[6px] w-[6px] rounded-full transition-all duration-200",
          color === "navy" ? "bg-brand-navy" : "bg-brand-gold",
          !active && "opacity-30 scale-75"
        )}
      />
      {children}
    </button>
  );
}
