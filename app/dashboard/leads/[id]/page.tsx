import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getLeadDetail } from "@/app/dashboard/leads/actions";
import { LeadDetailView } from "@/components/dashboard/LeadDetailView";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const res = await getLeadDetail(id);
  if (!res.ok) notFound();

  const supabase = await createClient();
  const { data: franchises } = await supabase
    .from("franchises")
    .select("id, name, code")
    .order("created_at");

  return (
    <LeadDetailView
      lead={res.lead}
      timeline={res.timeline}
      duplicates={res.duplicates}
      franchises={franchises ?? []}
      canReassign
      basePath="/dashboard/leads"
    />
  );
}
