import { Skeleton } from "@/components/ui/skeleton";
import { LEAD_STATUSES } from "./schema";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-8">
      <Skeleton className="mb-2 h-8 w-40" />
      <Skeleton className="mb-6 h-4 w-80" />
      <div className="flex gap-4 overflow-x-auto pb-4">
        {LEAD_STATUSES.map((c) => (
          <div key={c.key} className="w-72 shrink-0">
            <Skeleton className="mb-2 h-5 w-32" />
            <div className="space-y-2 rounded-xl border border-dashed border-border bg-muted/20 p-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
