import { IndianRupee, Percent, Wallet, Coins, BarChart3, PieChart, TrendingUp, Building2 } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { reportRange, revenueSeries } from "@/lib/reports";
import { buildSeries } from "@/lib/dashboard";
import { LEAD_STATUSES } from "@/app/dashboard/leads/schema";
import { formatINR } from "@/lib/format";
import { StatCard } from "@/components/ui/stat-card";
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
import { ReportPanel, SectionHeading } from "@/components/dashboard/ReportPanel";
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

  const totalLeadsIn = leadsIn.length;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-7 lg:px-8">
      {/* ── Header ── */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold tracking-tight text-brand-navy">Reports</h2>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Performance, leads, and revenue for <span className="font-medium text-foreground/80">{range.label}</span>.
          </p>
        </div>
        <ReportsDateRange current={{ period: range.period, from: range.from, to: range.to }} />
      </div>

      {/* ═══════════ Headline KPIs ═══════════ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
        <StatCard label="Revenue" value={formatINR(totalRevenue)} icon={IndianRupee} color="emerald" changeText={range.label} />
        <StatCard label="Commission Earned" value={formatINR(totalCommEarned)} icon={Percent} color="navy" changeText="On verified payments" />
        <StatCard label="Settled (period)" value={formatINR(settledInPeriod)} icon={Wallet} color="violet" changeText="Paid out this period" />
        <StatCard label="Commission Owed" value={formatINR(totalOwed)} icon={Coins} color="gold" changeText="Current outstanding" />
      </div>

      {/* ═══════════ Revenue & Commission ═══════════ */}
      <SectionHeading>Revenue &amp; Commission</SectionHeading>
      <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
        <ReportPanel title="Revenue Trend" subtitle={range.label} icon={TrendingUp} className="lg:col-span-2">
          <RevenueTrend data={revTrend} />
        </ReportPanel>
        <ReportPanel title="Commission by Franchise" icon={Coins} bodyClassName="px-1 py-2">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/20 hover:bg-transparent">
                <TableHead className="pl-5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">Franchise</TableHead>
                <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">Earned</TableHead>
                <TableHead className="pr-5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">Owed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perf.map((p) => (
                <TableRow key={p.code} className="border-b border-border/10 transition-colors hover:bg-muted/20">
                  <TableCell className="pl-5 font-mono text-xs text-muted-foreground">{p.code}</TableCell>
                  <TableCell className="text-right tabular-nums text-[13px]">{formatINR(p.commissionEarned)}</TableCell>
                  <TableCell className="pr-5 text-right text-[13px] tabular-nums font-semibold text-brand-navy">{formatINR(p.owed)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ReportPanel>
      </div>

      {/* ═══════════ Franchise Performance ═══════════ */}
      <SectionHeading>Franchise Performance</SectionHeading>
      <div className="grid gap-4 lg:gap-5">
        <ReportPanel title="Performance by Franchise" icon={Building2} bodyClassName="px-1 py-2">
          <FranchisePerformanceTable rows={perf} />
        </ReportPanel>
        <ReportPanel title="Revenue by Franchise" subtitle={range.label} icon={BarChart3}>
          <RevenueByFranchiseBar data={revenueByFr} />
        </ReportPanel>
      </div>

      {/* ═══════════ Lead Analytics ═══════════ */}
      <SectionHeading>Lead Analytics</SectionHeading>
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <ReportPanel title="Leads by Source" subtitle={`${totalLeadsIn} leads in period`} icon={PieChart}>
          <LeadsBySourceDonut data={bySource} />
        </ReportPanel>
        <ReportPanel title="Lead Status Funnel" icon={BarChart3}>
          <LeadStatusFunnel data={byStatus} />
        </ReportPanel>
      </div>
      <div className="mt-4 lg:mt-5">
        <ReportPanel title="Leads Over Time" subtitle={range.label} icon={TrendingUp}>
          <LeadsOverTimeChart data={leadsSeries} />
        </ReportPanel>
      </div>

      {/* ═══════════ Settlement tool ═══════════ */}
      <SectionHeading>Settlement</SectionHeading>
      <SettlementPanel franchises={(franchises ?? []).filter((f) => f.code !== "HQ")} />
    </div>
  );
}
