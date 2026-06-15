"use client";

import { cn } from "@/lib/utils";

export type StageDatum = { key: string; label: string; count: number };

const STAGE_COLORS: Record<string, { bar: string; dot: string; bg: string }> = {
  new: { bar: "bg-blue-500", dot: "bg-blue-500", bg: "bg-blue-500/10" },
  contacted: { bar: "bg-indigo-500", dot: "bg-indigo-500", bg: "bg-indigo-500/10" },
  documents_pending: { bar: "bg-amber-500", dot: "bg-amber-500", bg: "bg-amber-500/10" },
  in_progress: { bar: "bg-orange-500", dot: "bg-orange-500", bg: "bg-orange-500/10" },
  completed: { bar: "bg-emerald-500", dot: "bg-emerald-500", bg: "bg-emerald-500/10" },
  closed: { bar: "bg-slate-400", dot: "bg-slate-400", bg: "bg-slate-400/10" },
};

const DEFAULT_COLOR = { bar: "bg-brand-navy", dot: "bg-brand-navy", bg: "bg-brand-navy/10" };

/**
 * Conversion Rate Panel — premium with colored progress bars per stage,
 * circular progress indicator for overall conversion, and visual hierarchy.
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
  const max = Math.max(1, ...stageData.map((d) => d.count));

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <p className="font-heading text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
            Conversion Rate
          </p>
          <div className="mt-3 flex items-end gap-3">
            {/* Big number */}
            <span className="font-heading text-4xl font-extrabold tracking-tight text-foreground leading-none">
              {conversion}%
            </span>
            {/* Badge */}
            <span
              className={cn(
                "mb-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold",
                conversion > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
              )}
            >
              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                <path d="M6 2.5V9.5M6 2.5L3 5.5M6 2.5L9 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {closedCount}/{total}
            </span>
          </div>
        </div>
        {/* Mini circular indicator */}
        <div className="relative h-12 w-12 shrink-0">
          <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" className="text-border/40" />
            <circle
              cx="24" cy="24" r="20" fill="none"
              stroke="currentColor" strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${(conversion / 100) * 125.6} 125.6`}
              className="text-brand-navy transition-all duration-700 ease-out"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-brand-navy tabular-nums">
            {conversion}%
          </span>
        </div>
      </div>

      {/* Pipeline stages with colored bars */}
      <div className="flex flex-1 flex-col">
        {stageData.map((stage, i) => {
          const pct = total > 0 ? Math.round((stage.count / total) * 100) : 0;
          const barPct = max > 0 ? (stage.count / max) * 100 : 0;
          const colors = STAGE_COLORS[stage.key] ?? DEFAULT_COLOR;

          return (
            <div
              key={stage.key}
              className={cn(
                "group/stage py-3 transition-colors duration-150 hover:bg-muted/20 -mx-2 px-2 rounded-lg",
                i < stageData.length - 1 && "border-b border-border/20"
              )}
            >
              {/* Label row */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full shrink-0", colors.dot)} />
                  <span className="font-heading text-[13px] font-semibold text-foreground">{stage.label}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] text-muted-foreground/60 tabular-nums">{pct}%</span>
                  <span className="text-[15px] font-bold tabular-nums text-foreground min-w-[28px] text-right">
                    {stage.count}
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                <div
                  className={cn("h-full rounded-full transition-all duration-500 ease-out", colors.bar)}
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
