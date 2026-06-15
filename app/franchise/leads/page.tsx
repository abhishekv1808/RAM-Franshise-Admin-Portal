import { createClient } from "@/lib/supabase/server";
import { LeadKanban } from "@/components/dashboard/LeadKanban";
import { PageHeader } from "@/components/ui/page-header";
import type { LeadCard } from "@/app/dashboard/leads/schema";

export const dynamic = "force-dynamic";

export default async function FranchiseLeadsPage() {
  const supabase = await createClient();

  // NO manual franchise filter — RLS scopes this to the admin's own leads.
  // That is precisely what proves isolation: HQ's leads can never appear here.
  const { data: leadsRaw } = await supabase
    .from("leads")
    .select(
      "id, full_name, phone, service_interested, source, work_status, created_at, franchise_id, franchises(name, code)"
    )
    .order("created_at", { ascending: false });

  const leads: LeadCard[] = (leadsRaw ?? []).map((l) => {
    const lf = l.franchises as unknown as { name: string; code: string } | null;
    return {
      id: l.id,
      full_name: l.full_name,
      phone: l.phone,
      service_interested: l.service_interested,
      source: l.source,
      work_status: l.work_status,
      created_at: l.created_at,
      franchise_id: l.franchise_id,
      franchise_name: lf?.name ?? null,
      franchise_code: lf?.code ?? null,
    };
  });

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-8">
      <PageHeader description="Your franchise's pipeline — drag a card to move it through the stages." />
      <LeadKanban leads={leads} franchises={[]} showFranchiseFilter={false} />
    </div>
  );
}
