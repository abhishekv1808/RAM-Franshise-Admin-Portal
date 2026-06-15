import Link from "next/link";
import { Users, Inbox, Clock, CheckCircle2, ArrowRight, IndianRupee, Percent, Coins } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatINR } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PipelineByStage } from "@/components/dashboard/PipelineByStage";
import { ActivityFeed, type ActivityRow } from "@/components/dashboard/ActivityFeed";
import { LEAD_STATUSES } from "@/app/dashboard/leads/schema";

export const dynamic = "force-dynamic";

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

  const stageData = LEAD_STATUSES.map((s) => ({
    key: s.key,
    label: s.label,
    count: count(s.key),
  }));

  const activity: ActivityRow[] = (activityRaw ?? []).map((a) => ({
    id: a.id,
    action: a.action,
    details: a.details,
    created_at: a.created_at,
    franchise_code: (a.franchises as unknown as { code: string } | null)?.code ?? null,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <PageHeader title="Overview" description="Your franchise's leads at a glance.">
        <Button asChild className="bg-brand-navy hover:bg-brand-navy/90">
          <Link href="/franchise/leads">
            Go to My Leads <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </PageHeader>

      {/* Stat cards (scoped to this franchise) */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="My Total Leads"
          value={total}
          icon={Users}
          trend={thisMonth > 0 ? { text: `+${thisMonth} this month`, positive: true } : undefined}
          subtext={thisMonth === 0 ? "No new leads this month" : undefined}
        />
        <StatCard label="New Leads" value={count("new")} icon={Inbox} subtext="Awaiting first contact" />
        <StatCard label="In Progress" value={count("in_progress")} icon={Clock} subtext="Being worked" />
        <StatCard label="Completed" value={count("completed")} icon={CheckCircle2} subtext="Closed won" />
      </div>

      {/* Financials (scoped to this franchise) */}
      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        <StatCard label="Revenue (MTD)" value={formatINR(revenueMTD)} icon={IndianRupee} subtext={`Verified payments · ${monthLabel}`} />
        <StatCard label="Commission Earned" value={formatINR(earned)} icon={Percent} subtext="On verified payments" />
        <StatCard label="Commission Owed" value={formatINR(owed)} icon={Coins} subtext="Awaiting settlement" />
      </div>

      {/* Pipeline + activity */}
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-brand-navy">Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <PipelineByStage data={stageData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-brand-navy">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed rows={activity} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
