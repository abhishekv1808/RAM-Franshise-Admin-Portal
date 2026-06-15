import { cn } from "@/lib/utils";

export type StageDatum = { key: string; label: string; count: number };

const GOLD = new Set(["completed", "closed"]);

export function PipelineByStage({ data }: { data: StageDatum[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);

  if (total === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No leads in the pipeline yet.</p>;
  }

  return (
    <div className="space-y-4">
      {data.map((d) => {
        const pct = (d.count / max) * 100;
        const isGold = GOLD.has(d.key);
        return (
          <div key={d.key} className="group">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="text-foreground font-medium">{d.label}</span>
              <span className="tabular-nums font-semibold text-foreground">{d.count}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  isGold ? "bg-brand-gold" : "bg-brand-navy",
                  "group-hover:opacity-80",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
