import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import {
  FranchiseDetailEditor,
  type ActivityEntry,
} from "@/components/dashboard/FranchiseDetailEditor";

export const dynamic = "force-dynamic";

export default async function FranchiseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: f } = await supabase
    .from("franchises")
    .select(
      "id, name, code, city, status, pincodes, commission_percent, contact_email, contact_phone, created_at, leads(count)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!f) notFound();

  const leads = f.leads as unknown as { count: number }[] | null;

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("franchise_id", id)
    .eq("role", "franchise_admin")
    .maybeSingle();

  const { data: activity } = await supabase
    .from("activity_logs")
    .select("id, action, created_at, details")
    .eq("franchise_id", id)
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-7 lg:px-8">
      <Link
        href="/dashboard/franchises"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-brand-navy"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to franchises
      </Link>

      <div className="mt-4">
        <FranchiseDetailEditor
          initial={{
            id: f.id,
            name: f.name,
            code: f.code,
            city: f.city,
            status: f.status,
            pincodes: f.pincodes ?? [],
            commission_percent: f.commission_percent,
            contact_email: f.contact_email,
            contact_phone: f.contact_phone,
            created_at: f.created_at,
            leadCount: leads?.[0]?.count ?? 0,
          }}
          admin={adminProfile ?? null}
          activity={(activity ?? []) as ActivityEntry[]}
        />
      </div>
    </div>
  );
}
