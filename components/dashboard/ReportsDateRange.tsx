"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type Current = { period: string; from?: string; to?: string };

const PRESETS = [
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "custom", label: "Custom" },
];

export function ReportsDateRange({ current }: { current: Current }) {
  const router = useRouter();

  function go(period: string, from?: string, to?: string) {
    const sp = new URLSearchParams();
    if (period !== "this_month") sp.set("period", period);
    if (period === "custom") {
      if (from) sp.set("from", from);
      if (to) sp.set("to", to);
    }
    const qs = sp.toString();
    router.push(qs ? `/dashboard/reports?${qs}` : "/dashboard/reports");
  }

  const isCustom = current.period === "custom";
  const inputCls = "h-9 rounded-md border border-input bg-white px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-md border border-border bg-white p-0.5">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => go(p.key, current.from, current.to)}
            className={cn(
              "rounded px-3 py-1.5 text-sm font-medium transition-colors",
              current.period === p.key ? "bg-brand-navy text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            defaultValue={current.from}
            className={inputCls}
            onChange={(e) => go("custom", e.target.value, current.to)}
          />
          <span className="text-muted-foreground">→</span>
          <input
            type="date"
            defaultValue={current.to}
            className={inputCls}
            onChange={(e) => go("custom", current.from, e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
