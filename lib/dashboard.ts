import type { TimePoint } from "@/components/dashboard/LeadsOverTimeChart";

export type PeriodKey = "this_month" | "last_month" | "last_3_months" | "ytd";

export function periodRange(period: string | undefined): { start: Date; end: Date } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  switch (period) {
    case "last_month":
      return {
        start: new Date(Date.UTC(y, m - 1, 1)),
        end: new Date(Date.UTC(y, m, 1) - 1), // last ms of previous month
      };
    case "last_3_months":
      return { start: new Date(Date.UTC(y, m - 2, 1)), end: now };
    case "ytd":
      return { start: new Date(Date.UTC(y, 0, 1)), end: now };
    case "this_month":
    default:
      return { start: new Date(Date.UTC(y, m, 1)), end: now };
  }
}

// Cumulative-within-period daily series for leads created and leads closed.
export function buildSeries(start: Date, end: Date, leadDates: Date[], closedDates: Date[]): TimePoint[] {
  const out: TimePoint[] = [];
  const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

  while (cur <= last) {
    const dayEnd = new Date(cur);
    dayEnd.setUTCHours(23, 59, 59, 999);
    const leads = leadDates.filter((d) => d >= start && d <= dayEnd).length;
    const closed = closedDates.filter((d) => d >= start && d <= dayEnd).length;
    out.push({
      date: cur.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      leads,
      closed,
    });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}
