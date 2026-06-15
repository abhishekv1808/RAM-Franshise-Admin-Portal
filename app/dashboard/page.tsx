import Link from "next/link";
import { Users, Building2, Target, IndianRupee, Coins, BarChart3, Activity } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatINR } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LeadsOverTimeChart } from "@/components/dashboard/LeadsOverTimeChart";
import { PipelineByStage } from "@/components/dashboard/PipelineByStage";
import { ActivityFeed, type ActivityRow } from "@/components/dashboard/ActivityFeed";
import { LEAD_STATUSES } from "@/app/dashboard/leads/schema";
import { periodRange, buildSeries } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

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
  const activeNames = activeFr
    .map((f) => (f.code === "HQ" ? "HQ" : f.name.split(" ")[0]))
    .join(" + ");

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
      ...f,
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

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8">
      <PageHeader title="Overview" description="Leads, franchises, and activity across all branches.">
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/activity">
            <Activity className="h-4 w-4" /> Activity
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/reports">
            <BarChart3 className="h-4 w-4" /> Reports
          </Link>
        </Button>
      </PageHeader>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-3 xl:grid-cols-5" style={{ animationDelay: '50ms' }}>
        <StatCard
          label="Total Leads"
          value={total}
          icon={Users}
          trend={leadsThisMonth > 0 ? { text: `+${leadsThisMonth} this month`, positive: true } : undefined}
          subtext={leadsThisMonth === 0 ? "No new leads this month" : undefined}
        />
        <StatCard
          label="Active Franchises"
          value={activeFr.length}
          icon={Building2}
          subtext={activeNames || "—"}
        />
        <StatCard
          label="Conversion"
          value={`${conversion}%`}
          icon={Target}
          subtext={`${closedCount} of ${total} closed`}
        />
        <StatCard
          label="Revenue (MTD)"
          value={formatINR(revenueMTD)}
          icon={IndianRupee}
          subtext={`Verified payments · ${monthLabel}`}
        />
        <StatCard
          label="Commission Owed"
          value={formatINR(commissionOwed)}
          icon={Coins}
          subtext="Unsettled across franchises"
        />
      </div>

      {/* Trend + pipeline */}
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base text-brand-navy">Leads Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadsOverTimeChart data={series} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-brand-navy">Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <PipelineByStage data={stageData} />
          </CardContent>
        </Card>
      </div>

      {/* Franchise performance */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base text-brand-navy">Franchise Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Franchise</TableHead>
                <TableHead>City</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Conversion</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perf.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <span className="font-medium text-foreground">{f.name}</span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">{f.code}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{f.city ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{f.total}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {f.conversion}%
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-transparent capitalize",
                        f.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      )}
                    >
                      {f.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base text-brand-navy">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed rows={activity} />
        </CardContent>
      </Card>
    </div>
  );
}
