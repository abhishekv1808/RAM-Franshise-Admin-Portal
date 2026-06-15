import { IndianRupee, Percent, Wallet, Coins } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { reportRange, revenueSeries } from "@/lib/reports";
import { buildSeries } from "@/lib/dashboard";
import { LEAD_STATUSES } from "@/app/dashboard/leads/schema";
import { formatINR } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReportsDateRange } from "@/components/dashboard/ReportsDateRange";
import { SettlementPanel } from "@/components/dashboard/SettlementPanel";
import { FranchisePerformanceTable, type PerfRow } from "@/components/dashboard/FranchisePerformanceTable";
import { LeadsOverTimeChart } from "@/components/dashboard/LeadsOverTimeChart";
import {
  RevenueByFranchiseBar,
  LeadsBySourceDonut,
  LeadStatusFunnel,
  RevenueTrend,
} from "@/components/dashboard/reports-charts";

export const dynamic = "force-dynamic";

const CLOSED = new Set(["completed", "closed"]);
const SOURCE_LABEL: Record<string, string> = {
  website: "Website",
  whatsapp: "WhatsApp",
  google: "Google",
  walk_in: "Walk-in",
  referral: "Referral",
};
const srcLabel = (s: string | null) => {
  const k = (s ?? "").toLowerCase().replace(/\s+/g, "_");
  return SOURCE_LABEL[k] ?? (s ? s : "Unknown");
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const range = reportRange(sp.period, sp.from, sp.to);
  const supabase = await createClient();

  const [{ data: franchises }, { data: leadsAll }, { data: paysAll }, { data: ledgerAll }, { data: changes }, { data: settlements }] =
    await Promise.all([
      supabase.from("franchises").select("id, name, code, status").order("created_at"),
      supabase.from("leads").select("franchise_id, work_status, source, created_at"),
      supabase.from("payments").select("franchise_id, amount, commission_amount, kind, status, paid_at"),
      supabase.from("franchise_commission_summary").select("franchise_id, commission_owed, commission_settled"),
      supabase.from("activity_logs").select("details, created_at").eq("action", "status_changed"),
      supabase.from("commission_settlements").select("amount, settled_at"),
    ]);

  const leads = leadsAll ?? [];
  const pays = paysAll ?? [];
  const owedByFr = new Map((ledgerAll ?? []).map((l) => [l.franchise_id, Number(l.commission_owed)]));

  // Period slices.
  const leadsIn = leads.filter((l) => l.created_at >= range.startISO && l.created_at < range.endISO);
  const sign = (k: string) => (k === "reversal" ? -1 : 1);
  const paysIn = pays.filter((p) => p.status === "verified" && p.paid_at >= range.startDate && p.paid_at <= range.endDate);

  // A) Franchise performance
  const perf: PerfRow[] = (franchises ?? []).map((f) => {
    const fl = leadsIn.filter((l) => l.franchise_id === f.id);
    const converted = fl.filter((l) => CLOSED.has(l.work_status)).length;
    const fp = paysIn.filter((p) => p.franchise_id === f.id);
    const revenue = fp.reduce((s, p) => s + sign(p.kind) * Number(p.amount), 0);
    const commissionEarned = fp.reduce((s, p) => s + sign(p.kind) * Number(p.commission_amount), 0);
    return {
      code: f.code,
      name: f.name,
      leads: fl.length,
      converted,
      conversion: fl.length ? Math.round((converted / fl.length) * 100) : 0,
      revenue,
      commissionEarned,
      owed: owedByFr.get(f.id) ?? 0,
    };
  });
  const revenueByFr = perf.map((p) => ({ name: p.code, revenue: p.revenue }));

  // B) Lead analytics
  const sourceMap = new Map<string, number>();
  for (const l of leadsIn) sourceMap.set(srcLabel(l.source), (sourceMap.get(srcLabel(l.source)) ?? 0) + 1);
  const bySource = [...sourceMap.entries()].map(([name, value]) => ({ name, value }));
  const byStatus = LEAD_STATUSES.map((s) => ({
    name: s.label,
    value: leadsIn.filter((l) => l.work_status === s.key).length,
  }));
  const leadDates = leadsIn.map((l) => new Date(l.created_at));
  const closedDates = (changes ?? [])
    .filter((c) => {
      const to = String((c.details as Record<string, unknown> | null)?.to ?? "");
      return CLOSED.has(to) && c.created_at >= range.startISO && c.created_at < range.endISO;
    })
    .map((c) => new Date(c.created_at));
  const leadsSeries = buildSeries(range.start, range.end, leadDates, closedDates);

  // C) Revenue & commission
  const totalRevenue = perf.reduce((s, p) => s + p.revenue, 0);
  const totalCommEarned = perf.reduce((s, p) => s + p.commissionEarned, 0);
  const totalOwed = perf.reduce((s, p) => s + p.owed, 0);
  const settledInPeriod = (settlements ?? [])
    .filter((s) => s.settled_at >= range.startISO && s.settled_at < range.endISO)
    .reduce((s, r) => s + Number(r.amount), 0);
  const revPoints = paysIn.map((p) => ({ date: new Date(p.paid_at), amount: sign(p.kind) * Number(p.amount) }));
  const revTrend = revenueSeries(range.start, range.end, revPoints);

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8">
      <PageHeader description={`Performance, leads, and revenue for ${range.label}.`}>
        <ReportsDateRange current={{ period: range.period, from: range.from, to: range.to }} />
      </PageHeader>

      {/* Settlement statement generator */}
      <div className="mb-8">
        <SettlementPanel franchises={(franchises ?? []).filter((f) => f.code !== "HQ")} />
      </div>

      {/* A — Franchise Performance */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Franchise Performance
      </h2>
      <Card>
        <CardContent className="pt-6">
          <FranchisePerformanceTable rows={perf} />
        </CardContent>
      </Card>
      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="text-base text-brand-navy">Revenue by Franchise</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueByFranchiseBar data={revenueByFr} />
        </CardContent>
      </Card>

      {/* B — Lead Analytics */}
      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Lead Analytics
      </h2>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-brand-navy">Leads by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadsBySourceDonut data={bySource} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-brand-navy">Lead Status Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadStatusFunnel data={byStatus} />
          </CardContent>
        </Card>
      </div>
      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="text-base text-brand-navy">Leads Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <LeadsOverTimeChart data={leadsSeries} />
        </CardContent>
      </Card>

      {/* C — Revenue & Commission */}
      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Revenue &amp; Commission
      </h2>
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <StatCard label="Revenue" value={formatINR(totalRevenue)} icon={IndianRupee} subtext={range.label} />
        <StatCard label="Commission Earned" value={formatINR(totalCommEarned)} icon={Percent} subtext="On verified payments" />
        <StatCard label="Settled (period)" value={formatINR(settledInPeriod)} icon={Wallet} subtext="Paid out this period" />
        <StatCard label="Commission Owed" value={formatINR(totalOwed)} icon={Coins} subtext="Current outstanding" />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base text-brand-navy">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueTrend data={revTrend} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-brand-navy">Commission by Franchise</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Franchise</TableHead>
                  <TableHead className="text-right">Earned</TableHead>
                  <TableHead className="text-right">Owed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perf.map((p) => (
                  <TableRow key={p.code}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.code}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatINR(p.commissionEarned)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatINR(p.owed)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
