import type { ElementType } from "react";
import { TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Premium stat card with gradient icon container, sparkline-style
 * trend badge, and bottom action row with hover micro-animation.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  subtext,
  changeText,
  color = "navy",
  soon = false,
}: {
  label: string;
  value: string | number;
  icon: ElementType;
  trend?: { text: string; positive?: boolean };
  subtext?: string;
  changeText?: string;
  color?: "navy" | "gold" | "emerald" | "violet";
  soon?: boolean;
}) {
  const colorMap = {
    navy: {
      iconBg: "bg-gradient-to-br from-brand-navy/10 to-brand-navy/[0.04]",
      iconText: "text-brand-navy",
      iconRing: "ring-brand-navy/[0.08]",
    },
    gold: {
      iconBg: "bg-gradient-to-br from-brand-gold/15 to-brand-gold/[0.04]",
      iconText: "text-brand-gold",
      iconRing: "ring-brand-gold/[0.08]",
    },
    emerald: {
      iconBg: "bg-gradient-to-br from-emerald-500/10 to-emerald-500/[0.03]",
      iconText: "text-emerald-600",
      iconRing: "ring-emerald-500/[0.08]",
    },
    violet: {
      iconBg: "bg-gradient-to-br from-violet-500/10 to-violet-500/[0.03]",
      iconText: "text-violet-600",
      iconRing: "ring-violet-500/[0.08]",
    },
  };

  const c = colorMap[soon ? "gold" : color];

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border/40 bg-white",
        "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]",
        "transition-all duration-300 ease-out",
        "hover:shadow-[0_8px_30px_rgba(0,0,0,0.06),0_2px_4px_rgba(0,0,0,0.03)]",
        "hover:-translate-y-[2px]",
      )}
    >
      {/* Decorative top accent line */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-[2px] opacity-0 transition-opacity duration-300 group-hover:opacity-100",
        color === "navy" && "bg-gradient-to-r from-brand-navy/60 via-brand-navy/30 to-transparent",
        color === "gold" && "bg-gradient-to-r from-brand-gold/60 via-brand-gold/30 to-transparent",
        color === "emerald" && "bg-gradient-to-r from-emerald-500/60 via-emerald-500/30 to-transparent",
        color === "violet" && "bg-gradient-to-r from-violet-500/60 via-violet-500/30 to-transparent",
      )} />

      <div className="p-5 pb-0">
        {/* Header: label + icon */}
        <div className="flex items-start justify-between">
          <p className="font-heading text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
            {label}
          </p>
          <span
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl ring-1",
              "transition-transform duration-300 group-hover:scale-105",
              c.iconBg, c.iconText, c.iconRing,
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
        </div>

        {/* Value + trend badge */}
        <div className="mt-4 flex items-end gap-2.5">
          <p
            className={cn(
              "font-heading text-[28px] font-extrabold tracking-tight leading-none",
              soon ? "text-muted-foreground/30" : "text-foreground"
            )}
          >
            {value}
          </p>
          {trend && (
            <span
              className={cn(
                "mb-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold",
                trend.positive !== false
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-600"
              )}
            >
              {trend.positive !== false ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {trend.text}
            </span>
          )}
        </div>
      </div>

      {/* Bottom row */}
      {changeText ? (
        <div className="mt-4 flex items-center justify-between border-t border-border/30 px-5 py-3">
          <p className="text-[11px] text-muted-foreground/70">{changeText}</p>
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 transition-all duration-200 group-hover:text-brand-navy group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      ) : subtext ? (
        <div className="mt-4 px-5 pb-4">
          <p className={cn("text-xs", soon ? "text-brand-gold/70" : "text-muted-foreground/60")}>
            {subtext}
          </p>
        </div>
      ) : <div className="h-4" />}
    </div>
  );
}
