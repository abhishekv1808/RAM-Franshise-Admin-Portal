// Report date ranges computed in IST (UTC+5:30), inclusive of the whole period.
// Returns BOTH a UTC-instant range (for timestamptz cols like leads.created_at)
// and a date-string range (for date cols like payments.paid_at).
const IST_MS = 330 * 60000;
const pad = (n: number) => String(n).padStart(2, "0");

export type ReportRange = {
  startISO: string; // inclusive lower bound (UTC instant) for timestamptz
  endISO: string; // EXCLUSIVE upper bound (UTC instant) for timestamptz
  startDate: string; // inclusive YYYY-MM-DD (IST) for date columns
  endDate: string; // inclusive YYYY-MM-DD (IST) for date columns
  start: Date;
  end: Date;
  label: string;
  period: string;
  from?: string;
  to?: string;
};

export function reportRange(period?: string, from?: string, to?: string): ReportRange {
  const nowIST = new Date(Date.now() + IST_MS);
  const y = nowIST.getUTCFullYear();
  const m = nowIST.getUTCMonth();

  function monthRange(yy: number, mm: number) {
    const startInstant = Date.UTC(yy, mm, 1) - IST_MS; // IST midnight on the 1st
    const endInstant = Date.UTC(yy, mm + 1, 1) - IST_MS; // IST midnight next month (exclusive)
    const lastDay = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate();
    const label = new Date(Date.UTC(yy, mm, 1)).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
    return {
      startInstant,
      endInstant,
      startDate: `${yy}-${pad(mm + 1)}-01`,
      endDate: `${yy}-${pad(mm + 1)}-${pad(lastDay)}`,
      label,
    };
  }

  let r:
    | { startInstant: number; endInstant: number; startDate: string; endDate: string; label: string };

  if (period === "custom" && from && to) {
    const [fy, fm, fd] = from.split("-").map(Number);
    const [ty, tm, td] = to.split("-").map(Number);
    r = {
      startInstant: Date.UTC(fy, fm - 1, fd) - IST_MS,
      endInstant: Date.UTC(ty, tm - 1, td + 1) - IST_MS, // +1 day => 'to' inclusive
      startDate: from,
      endDate: to,
      label: `${from} → ${to}`,
    };
  } else if (period === "last_month") {
    r = monthRange(m === 0 ? y - 1 : y, m === 0 ? 11 : m - 1);
  } else {
    r = monthRange(y, m); // this_month (default)
  }

  return {
    startISO: new Date(r.startInstant).toISOString(),
    endISO: new Date(r.endInstant).toISOString(),
    startDate: r.startDate,
    endDate: r.endDate,
    start: new Date(r.startInstant),
    end: new Date(r.endInstant - 1),
    label: r.label,
    period: period === "custom" || period === "last_month" ? period : "this_month",
    from,
    to,
  };
}

// Cumulative daily revenue series within the range (₹ per day, paid_at-based).
export type RevPoint = { date: string; revenue: number };
export function revenueSeries(start: Date, end: Date, points: { date: Date; amount: number }[]): RevPoint[] {
  const out: RevPoint[] = [];
  const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (cur <= last) {
    const dayEnd = new Date(cur);
    dayEnd.setUTCHours(23, 59, 59, 999);
    const revenue = points.filter((p) => p.date >= start && p.date <= dayEnd).reduce((s, p) => s + p.amount, 0);
    out.push({ date: cur.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), revenue });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}
