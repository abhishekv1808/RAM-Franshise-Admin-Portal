"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { ACTIVITY_TYPES } from "@/lib/activity";

type Franchise = { id: string; name: string; code: string };
type Current = { f?: string; type?: string; from?: string; to?: string };

export function ActivityFilters({
  franchises,
  current,
}: {
  franchises: Franchise[];
  current: Current;
}) {
  const router = useRouter();

  function apply(next: Partial<Current>) {
    const merged = { ...current, ...next };
    const sp = new URLSearchParams();
    if (merged.f) sp.set("f", merged.f);
    if (merged.type) sp.set("type", merged.type);
    if (merged.from) sp.set("from", merged.from);
    if (merged.to) sp.set("to", merged.to);
    const qs = sp.toString();
    router.push(qs ? `/dashboard/activity?${qs}` : "/dashboard/activity");
  }

  const hasFilters = !!(current.f || current.type || current.from || current.to);
  const selectCls =
    "h-9 rounded-md border border-input bg-white px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30";

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <select className={selectCls} value={current.f ?? ""} onChange={(e) => apply({ f: e.target.value })}>
        <option value="">All franchises</option>
        {franchises.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name} ({f.code})
          </option>
        ))}
      </select>

      <select className={selectCls} value={current.type ?? ""} onChange={(e) => apply({ type: e.target.value })}>
        <option value="">All activity</option>
        {ACTIVITY_TYPES.map((t) => (
          <option key={t.key} value={t.key}>
            {t.label}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        From
        <input type="date" className={selectCls} value={current.from ?? ""} onChange={(e) => apply({ from: e.target.value })} />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        To
        <input type="date" className={selectCls} value={current.to ?? ""} onChange={(e) => apply({ to: e.target.value })} />
      </label>

      {hasFilters && (
        <button
          onClick={() => router.push("/dashboard/activity")}
          className="inline-flex h-9 items-center gap-1 rounded-md px-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" /> Clear
        </button>
      )}
    </div>
  );
}
