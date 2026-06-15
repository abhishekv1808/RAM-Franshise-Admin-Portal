import Link from "next/link";
import { Users, Building2, IndianRupee, Coins, BarChart3, ArrowRight, TrendingUp } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatINR } from "@/lib/format";
import { StatCard } from "@/components/ui/stat-card";
import { LeadsOverTimeChart } from "@/components/dashboard/LeadsOverTimeChart";
import { ConversionPanel } from "@/components/dashboard/ConversionPanel";
import { HighlightCard } from "@/components/dashboard/HighlightCard";
import { FranchiseTable } from "@/components/dashboard/FranchiseTable";
import { ActivityFeed, type ActivityRow } from "@/components/dashboard/ActivityFeed";
import { LEAD_STATUSES } from "@/app/dashboard/leads/schema";
import { periodRange, buildSeries } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

const CLOSED = new Set(["completed", "closed"]);

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period } = await searchParams;
  const supabase = await createClient();

  const [
    { data: franchises },
    { data: leadRows },
    { data: changes },
    { data: activityRaw },
    { data: payRows },
    { data: ledgerRows },
  ] = await Promise.all([
    supabase.from("franchises").select("id, name, code, city, status").order("created_at"),
    supabase.from("leads").select("franchise_id, work_status, created_at"),
    supabase.from("activity_logs").select("details, created_at").eq("action", "status_changed"),
    supabase
      .from("activity_logs")
      .select("id, action, details, created_at, franchises(code)")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("payments").select("amount, kind, status, paid_at"),
    supabase.from("franchise_commission_summary").select("commission_owed"),
  ]);

  const leads = leadRows ?? [];
  const total = leads.length;

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const leadsThisMonth = leads.filter((l) => new Date(l.created_at) >= monthStart).length;

  const closedCount = leads.filter((l) => CLOSED.has(l.work_status)).length;
  const conversion = total ? Math.round((closedCount / total) * 100) : 0;

  // Revenue (MTD) = verified payments this month, net of reversals.
  const revenueMTD = (payRows ?? []).reduce((s, p) => {
    if (p.status !== "verified" || new Date(p.paid_at) < monthStart) return s;
    const amt = Number(p.amount);
    return s + (p.kind === "reversal" ? -amt : amt);
  }, 0);
  const commissionOwed = (ledgerRows ?? []).reduce((s, l) => s + Number(l.commission_owed), 0);
  const monthLabel = now.toLocaleString("en-IN", { month: "short", year: "numeric" });

  const activeFr = (franchises ?? []).filter((f) => f.status === "active");

  // Pipeline by stage (all six, including zeros).
  const stageData = LEAD_STATUSES.map((s) => ({
    key: s.key,
    label: s.label,
    count: leads.filter((l) => l.work_status === s.key).length,
  }));

  // Leads-over-time series for the selected period.
  const { start, end } = periodRange(period);
  const leadDates = leads.map((l) => new Date(l.created_at));
  const closedDates = (changes ?? [])
    .filter((c) => CLOSED.has(String((c.details as Record<string, unknown> | null)?.to ?? "")))
    .map((c) => new Date(c.created_at));
  const series = buildSeries(start, end, leadDates, closedDates);

  const perf = (franchises ?? []).map((f) => {
    const own = leads.filter((l) => l.franchise_id === f.id);
    const ownClosed = own.filter((l) => CLOSED.has(l.work_status)).length;
    return {
      id: f.id,
      name: f.name,
      code: f.code,
      city: f.city,
      status: f.status,
      total: own.length,
      conversion: own.length ? Math.round((ownClosed / own.length) * 100) : 0,
    };
  });

  const activity: ActivityRow[] = (activityRaw ?? []).map((a) => ({
    id: a.id,
    action: a.action,
    details: a.details,
    created_at: a.created_at,
    franchise_code: (a.franchises as unknown as { code: string } | null)?.code ?? null,
  }));

  const leadsGrowth = total > 0 ? Math.round((leadsThisMonth / total) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-7 lg:px-8">

      {/* ═══════════ Stat Cards Row (4 across) ═══════════ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
        <StatCard
          label="Revenue (MTD)"
          value={formatINR(revenueMTD)}
          icon={IndianRupee}
          color="emerald"
          trend={revenueMTD > 0 ? { text: monthLabel, positive: true } : undefined}
          changeText={`Verified payments · ${monthLabel}`}
        />
        <StatCard
          label="Commission Owed"
          value={formatINR(commissionOwed)}
          icon={Coins}
          color="gold"
          changeText="Unsettled across franchises"
        />
        <StatCard
          label="Total Leads"
          value={total}
          icon={Users}
          color="navy"
          trend={leadsThisMonth > 0 ? { text: `+${leadsThisMonth} this month`, positive: true } : undefined}
          changeText={leadsThisMonth > 0 ? `+${leadsThisMonth} from this month` : "No new leads this month"}
        />
        <StatCard
          label="Active Franchises"
          value={activeFr.length}
          icon={Building2}
          color="violet"
          changeText={`${(franchises ?? []).length} total registered`}
        />
      </div>

      {/* ═══════════ Chart + Conversion Rate (2-column) ═══════════ */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3 lg:gap-5">
        {/* Overall Leads — large chart area */}
        <div className="overflow-hidden rounded-2xl border border-border/40 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border/30 px-6 py-4">
            <div>
              <p className="font-heading text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
                Overall Leads
              </p>
              <div className="mt-1.5 flex items-end gap-2.5">
                <span className="font-heading text-3xl font-extrabold leading-none tracking-tight text-foreground">
                  {total.toLocaleString("en-IN")}
                </span>
                {leadsThisMonth > 0 && (
                  <span className="mb-0.5 inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                    <TrendingUp className="h-3 w-3" />
                    {leadsGrowth}%
                  </span>
                )}
              </div>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/[0.03] text-emerald-600 ring-1 ring-emerald-500/[0.08]">
              <BarChart3 className="h-5 w-5" />
            </span>
          </div>
          <div className="px-6 py-5">
            <LeadsOverTimeChart data={series} />
          </div>
        </div>

        {/* Conversion Rate / Pipeline Panel */}
        <div className="overflow-hidden rounded-2xl border border-border/40 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="px-6 pb-5 pt-6">
            <ConversionPanel
              conversion={conversion}
              closedCount={closedCount}
              total={total}
              stageData={stageData}
            />
          </div>
        </div>
      </div>

      {/* ═══════════ Highlight CTA + Franchise List (1 : 2) ═══════════ */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3 lg:gap-5">
        <div className="lg:col-span-1">
          <HighlightCard
            commissionOwed={formatINR(commissionOwed)}
            conversion={conversion}
            activeFranchises={activeFr.length}
          />
        </div>
        <div className="lg:col-span-2">
          <FranchiseTable rows={perf} />
        </div>
      </div>

      {/* ═══════════ Recent Activity (full width) ═══════════ */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-border/40 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between border-b border-border/30 px-6 py-4">
          <div>
            <p className="font-heading text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
              Recent Activity
            </p>
            <p className="font-heading mt-1 text-base font-bold text-foreground">
              Latest Updates
            </p>
          </div>
          <Link
            href="/dashboard/activity"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-white px-3 py-1.5 text-[12px] font-semibold text-muted-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-150 hover:border-border hover:text-foreground hover:shadow-sm"
          >
            View All
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="px-6 py-4">
          <ActivityFeed rows={activity} />
        </div>
      </div>
    </div>
  );
}
