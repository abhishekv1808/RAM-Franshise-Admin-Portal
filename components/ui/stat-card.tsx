import type { ElementType } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Premium metric card — "subtle depth" aesthetic.
 * Layered shadow, hover lift, bold value, tinted icon container,
 * and trend indicators as soft pill badges.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  subtext,
  soon = false,
}: {
  label: string;
  value: string | number;
  icon: ElementType;
  trend?: { text: string; positive?: boolean };
  subtext?: string;
  soon?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative rounded-[var(--radius-card)] border border-border/50 bg-white p-6",
        "shadow-[var(--shadow-sm)]",
        "transition-all duration-[var(--transition-base)]",
        "hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5",
      )}
    >
      {/* Header: label + icon */}
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-[var(--radius-icon)]",
            "transition-colors duration-[var(--transition-fast)]",
            soon
              ? "bg-brand-gold/10 text-brand-gold"
              : "bg-brand-navy/[0.06] text-brand-navy group-hover:bg-brand-navy/[0.1]"
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>

      {/* Value */}
      <p
        className={cn(
          "mt-3 text-[28px] font-bold tracking-tight tabular-nums leading-none",
          soon ? "text-muted-foreground/40" : "text-brand-navy"
        )}
      >
        {value}
      </p>

      {/* Trend pill or subtext */}
      {trend ? (
        <span
          className={cn(
            "mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
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
      ) : subtext ? (
        <p className={cn("mt-3 text-xs leading-snug", soon ? "text-brand-gold/80" : "text-muted-foreground")}>
          {subtext}
        </p>
      ) : null}
    </div>
  );
}
