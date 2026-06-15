import { createClient } from "@/lib/supabase/server";
import { LeadKanban } from "@/components/dashboard/LeadKanban";
import { PageHeader } from "@/components/ui/page-header";
import type { LeadCard } from "./schema";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const supabase = await createClient();

  const { data: leadsRaw } = await supabase
    .from("leads")
    .select(
      "id, full_name, phone, service_interested, source, work_status, created_at, franchise_id, franchises(name, code)"
    )
    .order("created_at", { ascending: false });

  const leads: LeadCard[] = (leadsRaw ?? []).map((l) => {
    const fr = l.franchises as unknown as { name: string; code: string } | null;
    return {
      id: l.id,
      full_name: l.full_name,
      phone: l.phone,
      service_interested: l.service_interested,
      source: l.source,
      work_status: l.work_status,
      created_at: l.created_at,
      franchise_id: l.franchise_id,
      franchise_name: fr?.name ?? null,
      franchise_code: fr?.code ?? null,
    };
  });

  const { data: franchises } = await supabase
    .from("franchises")
    .select("id, name, code")
    .order("created_at");

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-8">
      <PageHeader description="Pipeline across all franchises — drag a card to move it through the stages." />
      <LeadKanban leads={leads} franchises={franchises ?? []} showFranchiseFilter canReassign />
    </div>
  );
}
