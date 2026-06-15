import { IndianRupee, Percent, Coins, Clock } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
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
import { PaymentsTable } from "@/components/dashboard/PaymentsTable";
import { RecordPaymentForm } from "@/components/dashboard/RecordPaymentForm";
import { SettleButton } from "@/components/dashboard/SettleButton";
import { formatINR } from "@/lib/format";
import type { PaymentRow, LedgerRow } from "./schema";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const supabase = await createClient();

  const [{ data: payRaw }, { data: ledgerRaw }, { data: franchises }] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "id, client_name, amount, commission_amount, payment_method, status, kind, paid_at, created_at, reverses_id, settlement_id, notes, franchises(code)"
      )
      .order("created_at", { ascending: false }),
    supabase.from("franchise_commission_summary").select("*").order("code"),
    supabase.from("franchises").select("id, name, code").order("created_at"),
  ]);

  const rows: PaymentRow[] = (payRaw ?? []).map((p) => ({
    id: p.id,
    client_name: p.client_name,
    amount: Number(p.amount),
    commission_amount: Number(p.commission_amount),
    payment_method: p.payment_method,
    status: p.status,
    kind: p.kind,
    paid_at: p.paid_at,
    created_at: p.created_at,
    franchise_code: (p.franchises as unknown as { code: string } | null)?.code ?? null,
    reverses_id: p.reverses_id,
    settlement_id: p.settlement_id,
    notes: p.notes,
  }));
  const reversedIds = rows.filter((r) => r.kind === "reversal" && r.reverses_id).map((r) => r.reverses_id!);

  const ledger: LedgerRow[] = (ledgerRaw ?? []).map((l) => ({
    franchise_id: l.franchise_id,
    name: l.name,
    code: l.code,
    gross_collected: Number(l.gross_collected),
    commission_earned: Number(l.commission_earned),
    commission_settled: Number(l.commission_settled),
    commission_owed: Number(l.commission_owed),
    pending_count: Number(l.pending_count),
  }));

  const totalCollected = ledger.reduce((s, l) => s + l.gross_collected, 0);
  const totalEarned = ledger.reduce((s, l) => s + l.commission_earned, 0);
  const totalOwed = ledger.reduce((s, l) => s + l.commission_owed, 0);
  const totalPending = ledger.reduce((s, l) => s + l.pending_count, 0);

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8">
      <PageHeader description="Record, verify, and settle payments across all franchises.">
        <RecordPaymentForm franchises={franchises ?? []} />
      </PageHeader>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Collected (verified)" value={formatINR(totalCollected)} icon={IndianRupee} subtext="Net of reversals" />
        <StatCard label="Commission Earned" value={formatINR(totalEarned)} icon={Percent} subtext="On verified payments" />
        <StatCard label="Commission Owed" value={formatINR(totalOwed)} icon={Coins} subtext="Unsettled, to pay out" />
        <StatCard label="Pending Verification" value={totalPending} icon={Clock} subtext="Awaiting confirmation" />
      </div>

      {/* Commission ledger */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base text-brand-navy">Commission Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Franchise</TableHead>
                <TableHead className="text-right">Collected</TableHead>
                <TableHead className="text-right">Earned</TableHead>
                <TableHead className="text-right">Settled</TableHead>
                <TableHead className="text-right">Owed</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.map((l) => (
                <TableRow key={l.franchise_id}>
                  <TableCell>
                    <span className="font-medium text-foreground">{l.name}</span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">{l.code}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatINR(l.gross_collected)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatINR(l.commission_earned)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{formatINR(l.commission_settled)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className={l.commission_owed < 0 ? "font-medium text-rose-600" : l.commission_owed > 0 ? "font-medium text-brand-navy" : "text-muted-foreground"}>
                      {formatINR(l.commission_owed)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {l.code === "HQ" ? (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    ) : (
                      <div className="flex justify-end">
                        <SettleButton franchiseId={l.franchise_id} owed={l.commission_owed} />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payments list */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base text-brand-navy">All Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentsTable rows={rows} reversedIds={reversedIds} canManage />
        </CardContent>
      </Card>
    </div>
  );
}
