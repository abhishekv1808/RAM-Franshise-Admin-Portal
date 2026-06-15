"use client";

import { BarChart3 } from "lucide-react";

import { cn } from "@/lib/utils";

export type StageDatum = { key: string; label: string; count: number };

const STAGE_DOT: Record<string, string> = {
  new: "bg-blue-500",
  contacted: "bg-indigo-500",
  documents_pending: "bg-amber-500",
  in_progress: "bg-orange-500",
  completed: "bg-emerald-500",
  closed: "bg-slate-400",
};

/**
 * Conversion Rate panel — funnel-style breakdown matching the reference:
 * header with the headline rate, then one row per pipeline stage showing the
 * stage label, its share of total leads, and the absolute count.
 */
export function ConversionPanel({
  conversion,
  closedCount,
  total,
  stageData,
}: {
  conversion: number;
  closedCount: number;
  total: number;
  stageData: StageDatum[];
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-heading text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
            Conversion Rate
          </p>
          <div className="mt-2.5 flex items-end gap-2.5">
            <span className="font-heading text-3xl font-extrabold tracking-tight text-foreground leading-none">
              {conversion}%
            </span>
            <span
              className={cn(
                "mb-0.5 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold",
                conversion > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500",
              )}
            >
              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                <path d="M6 2.5V9.5M6 2.5L3 5.5M6 2.5L9 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {closedCount}/{total}
            </span>
          </div>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-navy/10 to-brand-navy/[0.03] text-brand-navy ring-1 ring-brand-navy/[0.06]">
          <BarChart3 className="h-[18px] w-[18px]" />
        </span>
      </div>

      {/* Funnel rows */}
      <div className="mt-5 flex flex-1 flex-col">
        {stageData.map((stage, i) => {
          const pct = total > 0 ? (stage.count / total) * 100 : 0;
          const pctLabel = pct >= 10 || pct === 0 ? Math.round(pct) : pct.toFixed(1);

          return (
            <div
              key={stage.key}
              className={cn(
                "flex items-center justify-between py-3.5",
                i < stageData.length - 1 && "border-b border-border/25",
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", STAGE_DOT[stage.key] ?? "bg-brand-navy")} />
                <div className="min-w-0">
                  <p className="font-heading truncate text-[13px] font-semibold text-foreground">{stage.label}</p>
                  <p className="text-[11px] text-muted-foreground/60 tabular-nums">{pctLabel}%</p>
                </div>
              </div>
              <span className="font-heading text-[15px] font-bold tabular-nums text-foreground">
                {stage.count.toLocaleString("en-IN")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
