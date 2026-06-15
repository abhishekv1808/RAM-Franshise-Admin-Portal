import Link from "next/link";
import { Users, IndianRupee, Coins, Percent, ArrowRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatINR } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { ConversionPanel } from "@/components/dashboard/ConversionPanel";
import { ActivityFeed, type ActivityRow } from "@/components/dashboard/ActivityFeed";
import { LEAD_STATUSES } from "@/app/dashboard/leads/schema";

export const dynamic = "force-dynamic";

const CLOSED = new Set(["completed", "closed"]);

export default async function FranchiseDashboardPage() {
  const supabase = await createClient();

  // RLS scopes every query below to the franchise admin's OWN franchise — there
  // is no manual franchise_id filter, so HQ's data can never appear here.
  const [{ data: leadRows }, { data: activityRaw }, { data: payRows }, { data: ledger }] =
    await Promise.all([
      supabase.from("leads").select("work_status, created_at"),
      supabase
        .from("activity_logs")
        .select("id, action, details, created_at, franchises(code)")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase.from("payments").select("amount, kind, status, paid_at"),
      supabase
        .from("franchise_commission_summary")
        .select("commission_earned, commission_owed")
        .maybeSingle(),
    ]);

  const leads = leadRows ?? [];
  const total = leads.length;
  const count = (k: string) => leads.filter((l) => l.work_status === k).length;
  const closedCount = leads.filter((l) => CLOSED.has(l.work_status)).length;
  const conversion = total ? Math.round((closedCount / total) * 100) : 0;

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const thisMonth = leads.filter((l) => new Date(l.created_at) >= monthStart).length;

  // Financials (RLS-scoped to this franchise).
  const revenueMTD = (payRows ?? []).reduce((s, p) => {
    if (p.status !== "verified" || new Date(p.paid_at) < monthStart) return s;
    const amt = Number(p.amount);
    return s + (p.kind === "reversal" ? -amt : amt);
  }, 0);
  const earned = Number(ledger?.commission_earned ?? 0);
  const owed = Number(ledger?.commission_owed ?? 0);
  const monthLabel = now.toLocaleString("en-IN", { month: "short", year: "numeric" });

  const stageData = LEAD_STATUSES.map((s) => ({ key: s.key, label: s.label, count: count(s.key) }));

  const activity: ActivityRow[] = (activityRaw ?? []).map((a) => ({
    id: a.id,
    action: a.action,
    details: a.details,
    created_at: a.created_at,
    franchise_code: (a.franchises as unknown as { code: string } | null)?.code ?? null,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <PageHeader title="Overview" description="Your franchise at a glance.">
        <Button asChild className="bg-brand-navy hover:bg-brand-navy/90">
          <Link href="/franchise/leads">
            Go to My Leads <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </PageHeader>

      {/* KPI row (RLS-scoped, color-coded) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        <StatCard
          label="Revenue (MTD)"
          value={formatINR(revenueMTD)}
          icon={IndianRupee}
          color="emerald"
          changeText={`Verified payments · ${monthLabel}`}
        />
        <StatCard
          label="Commission Earned"
          value={formatINR(earned)}
          icon={Percent}
          color="violet"
          changeText="On verified payments"
        />
        <StatCard
          label="Commission Owed"
          value={formatINR(owed)}
          icon={Coins}
          color="gold"
          changeText="Awaiting settlement"
        />
        <StatCard
          label="My Total Leads"
          value={total}
          icon={Users}
          color="navy"
          trend={thisMonth > 0 ? { text: `+${thisMonth} this month`, positive: true } : undefined}
          changeText={thisMonth > 0 ? `+${thisMonth} new this month` : "No new leads this month"}
        />
      </div>

      {/* Pipeline + activity (elevated eyebrow-header cards, mirroring the super dashboard) */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2 lg:gap-5">
        <div className="overflow-hidden rounded-2xl border border-border/40 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="border-b border-border/30 px-6 py-4">
            <p className="font-heading text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
              Pipeline
            </p>
            <p className="font-heading mt-1 text-base font-bold text-foreground">Conversion &amp; Stages</p>
          </div>
          <div className="px-6 py-5">
            <ConversionPanel conversion={conversion} closedCount={closedCount} total={total} stageData={stageData} />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/40 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between border-b border-border/30 px-6 py-4">
            <div>
              <p className="font-heading text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
                Recent Activity
              </p>
              <p className="font-heading mt-1 text-base font-bold text-foreground">Latest Updates</p>
            </div>
            <Link
              href="/franchise/leads"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-white px-3 py-1.5 text-[12px] font-semibold text-muted-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-150 hover:border-border hover:text-foreground hover:shadow-sm"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="px-6 py-4">
            <ActivityFeed rows={activity} />
          </div>
        </div>
      </div>
    </div>
  );
}
