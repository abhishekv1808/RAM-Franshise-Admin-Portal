import { IndianRupee, Percent, Coins } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentsTable } from "@/components/dashboard/PaymentsTable";
import { RecordPaymentForm } from "@/components/dashboard/RecordPaymentForm";
import { formatINR } from "@/lib/format";
import type { PaymentRow } from "@/app/dashboard/payments/schema";

export const dynamic = "force-dynamic";

export default async function FranchisePaymentsPage() {
  const supabase = await createClient();

  // RLS scopes both queries to the franchise admin's own franchise.
  const [{ data: payRaw }, { data: ledgerRaw }] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "id, client_name, amount, commission_amount, payment_method, status, kind, paid_at, created_at, reverses_id, settlement_id, notes, franchises(code)"
      )
      .order("created_at", { ascending: false }),
    supabase.from("franchise_commission_summary").select("*").maybeSingle(),
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

  const ledger = ledgerRaw
    ? {
        franchise_id: ledgerRaw.franchise_id as string,
        gross: Number(ledgerRaw.gross_collected),
        earned: Number(ledgerRaw.commission_earned),
        owed: Number(ledgerRaw.commission_owed),
      }
    : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <PageHeader description="Your franchise's payments and commission. New entries are pending until head office verifies them.">
        {ledger && <RecordPaymentForm franchises={[]} lockedFranchiseId={ledger.franchise_id} />}
      </PageHeader>

      <div className="grid gap-5 sm:grid-cols-3">
        <StatCard label="Collected (verified)" value={formatINR(ledger?.gross ?? 0)} icon={IndianRupee} subtext="Net of reversals" />
        <StatCard label="Commission Earned" value={formatINR(ledger?.earned ?? 0)} icon={Percent} subtext="On verified payments" />
        <StatCard label="Commission Owed" value={formatINR(ledger?.owed ?? 0)} icon={Coins} subtext="Awaiting settlement" />
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base text-brand-navy">My Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentsTable rows={rows} reversedIds={[]} canManage={false} />
        </CardContent>
      </Card>
    </div>
  );
}
