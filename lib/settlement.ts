import type { SupabaseClient } from "@supabase/supabase-js";

export type StatementRow = {
  date: string;
  client: string;
  service: string;
  gross: number;
  pct: number;
  commission: number;
  settled: boolean;
  kind: string;
};

export type StatementData = {
  franchiseId: string;
  franchiseName: string;
  code: string;
  from: string;
  to: string;
  periodLabel: string;
  reference: string;
  generatedAt: string;
  rows: StatementRow[];
  totals: {
    grossCollected: number;
    commissionEarned: number;
    alreadySettled: number;
    netOwed: number;
  };
};

// Builds a settlement statement for a franchise + period. Lists ALL verified
// payments with paid_at in [from, to] (settled or not); the settle action then
// settles only the unsettled ones in that same window — keeping statement and
// settlement perfectly aligned.
export async function getStatementData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  franchiseId: string,
  from: string,
  to: string
): Promise<StatementData | null> {
  const { data: fr } = await supabase
    .from("franchises")
    .select("name, code")
    .eq("id", franchiseId)
    .maybeSingle();
  if (!fr) return null;

  const { data: pays } = await supabase
    .from("payments")
    .select("paid_at, client_name, service_slug, amount, commission_percent, commission_amount, kind, settlement_id")
    .eq("franchise_id", franchiseId)
    .eq("status", "verified")
    .gte("paid_at", from)
    .lte("paid_at", to)
    .order("paid_at", { ascending: true });

  const sign = (k: string) => (k === "reversal" ? -1 : 1);
  const rows: StatementRow[] = (pays ?? []).map((p) => ({
    date: p.paid_at,
    client: p.client_name ?? "—",
    service: p.service_slug ?? "—",
    gross: sign(p.kind) * Number(p.amount),
    pct: Number(p.commission_percent),
    commission: sign(p.kind) * Number(p.commission_amount),
    settled: !!p.settlement_id,
    kind: p.kind,
  }));

  const grossCollected = rows.reduce((s, r) => s + r.gross, 0);
  const commissionEarned = rows.reduce((s, r) => s + r.commission, 0);
  const alreadySettled = rows.filter((r) => r.settled).reduce((s, r) => s + r.commission, 0);
  const netOwed = commissionEarned - alreadySettled;

  // Reference: RAM/<CODE>/<YYYY-MM>/<seq> (seq = nth settlement for the month).
  const monthFirst = `${from.slice(0, 7)}-01`;
  const { count } = await supabase
    .from("commission_settlements")
    .select("*", { count: "exact", head: true })
    .eq("franchise_id", franchiseId)
    .eq("period_month", monthFirst);
  const seq = String((count ?? 0) + 1).padStart(3, "0");

  return {
    franchiseId,
    franchiseName: fr.name,
    code: fr.code,
    from,
    to,
    periodLabel: new Date(`${from}T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
    reference: `RAM/${fr.code}/${from.slice(0, 7)}/${seq}`,
    generatedAt: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    rows,
    totals: { grossCollected, commissionEarned, alreadySettled, netOwed },
  };
}
