import { notFound } from "next/navigation";

import { getLeadDetail } from "@/app/dashboard/leads/actions";
import { LeadDetailView } from "@/components/dashboard/LeadDetailView";

export const dynamic = "force-dynamic";

export default async function FranchiseLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // RLS-scoped: a franchise admin can only open leads in their own franchise.
  const res = await getLeadDetail(id);
  if (!res.ok) notFound();

  return (
    <LeadDetailView
      lead={res.lead}
      timeline={res.timeline}
      duplicates={res.duplicates}
      franchises={[]}
      canReassign={false}
      basePath="/franchise/leads"
    />
  );
}
