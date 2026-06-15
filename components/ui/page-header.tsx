import { cn } from "@/lib/utils";

/**
 * Shared in-content page header. The bare route name already lives in the top
 * bar, so prefer a descriptive `title` (e.g. "Overview") + `description`, and
 * put actions in `children` (right-aligned).
 */
export function PageHeader({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {title && (
          <h2 className="text-xl font-semibold tracking-tight text-brand-navy">{title}</h2>
        )}
        {description && (
          <p className={cn("text-sm text-muted-foreground", title && "mt-1.5")}>{description}</p>
        )}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}
