import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-7 lg:px-8">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[132px] rounded-2xl" />
        ))}
      </div>

      {/* Table card */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-border/40 bg-white">
        <div className="flex items-center justify-between border-b border-border/30 px-5 py-4">
          <Skeleton className="h-9 w-56 rounded-xl" />
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-9 w-64 rounded-xl" />
            <Skeleton className="h-9 w-36 rounded-xl" />
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="ml-auto h-4 w-10" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
