import Link from "next/link";
import { Plus, AlertCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { FranchisesTable, type FranchiseRow } from "@/components/dashboard/FranchisesTable";

export const dynamic = "force-dynamic";

export default async function FranchisesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("franchises")
    .select(
      "id, name, code, city, status, commission_percent, contact_email, created_at, leads(count)"
    )
    .order("created_at", { ascending: true });

  const franchises: FranchiseRow[] = (data ?? []).map((f) => {
    const leads = f.leads as unknown as { count: number }[] | null;
    return {
      id: f.id,
      name: f.name,
      code: f.code,
      city: f.city,
      status: f.status,
      commission_percent: f.commission_percent,
      contact_email: f.contact_email,
      created_at: f.created_at,
      leadCount: leads?.[0]?.count ?? 0,
    };
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
            Franchises
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {franchises.length} {franchises.length === 1 ? "franchise" : "franchises"} · manage territories, admins, and status
          </p>
        </div>
        <Button asChild className="bg-brand-navy hover:bg-brand-navy/90">
          <Link href="/dashboard/franchises/new">
            <Plus className="h-4 w-4" />
            Add Franchise
          </Link>
        </Button>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Couldn&apos;t load franchises</p>
            <p className="text-destructive/80">{error.message}</p>
          </div>
        </div>
      ) : (
        <FranchisesTable franchises={franchises} />
      )}
    </div>
  );
}
