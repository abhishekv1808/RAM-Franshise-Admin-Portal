import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Shared report card — matches the dashboard's polished surface: rounded-2xl
 * white card, soft shadow, an uppercase section label in the header, and an
 * optional icon tile or custom action on the right.
 */
export function ReportPanel({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  subtitle?: string;
  icon?: ElementType;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/40 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/30 px-6 py-4">
        <div className="min-w-0">
          <p className="font-heading text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
            {title}
          </p>
          {subtitle && <p className="mt-1 text-[13px] text-muted-foreground/70">{subtitle}</p>}
        </div>
        {action
          ? action
          : Icon && (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-navy/10 to-brand-navy/[0.03] text-brand-navy ring-1 ring-brand-navy/[0.06]">
                <Icon className="h-[18px] w-[18px]" />
              </span>
            )}
      </div>
      <div className={cn("px-6 py-5", bodyClassName)}>{children}</div>
    </div>
  );
}

/** Thin section divider with an uppercase label, for grouping report blocks. */
export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 mt-9 flex items-center gap-3 first:mt-0">
      <h2 className="font-heading text-[13px] font-bold uppercase tracking-[0.14em] text-brand-navy/70">
        {children}
      </h2>
      <div className="h-px flex-1 bg-border/40" />
    </div>
  );
}
