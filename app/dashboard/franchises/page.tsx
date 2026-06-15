import { AlertCircle, Building2, CheckCircle2, Users, Percent } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/ui/stat-card";
import { FranchisesTable, type FranchiseRow } from "@/components/dashboard/FranchisesTable";

export const dynamic = "force-dynamic";

const HQ_CODE = "HQ";

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

  const total = franchises.length;
  const activeCount = franchises.filter((f) => f.status === "active").length;
  const totalLeads = franchises.reduce((s, f) => s + f.leadCount, 0);
  const realFranchises = franchises.filter((f) => f.code !== HQ_CODE);
  const avgCommission = realFranchises.length
    ? Math.round(
        (realFranchises.reduce((s, f) => s + f.commission_percent, 0) / realFranchises.length) * 10,
      ) / 10
    : 0;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-7 lg:px-8">
      <div className="mb-6">
        <h2 className="font-heading text-xl font-bold tracking-tight text-brand-navy">Franchises</h2>
        <p className="mt-1 text-sm text-muted-foreground/70">
          Manage territories, admins, commission, and status across your network.
        </p>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Couldn&apos;t load franchises</p>
            <p className="text-destructive/80">{error.message}</p>
          </div>
        </div>
      ) : (
        <>
          {/* ═══════════ Summary cards ═══════════ */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
            <StatCard
              label="Total Franchises"
              value={total}
              icon={Building2}
              color="navy"
              changeText={`${realFranchises.length} active territories`}
            />
            <StatCard
              label="Active"
              value={activeCount}
              icon={CheckCircle2}
              color="emerald"
              changeText={`${total - activeCount} inactive`}
            />
            <StatCard
              label="Total Leads"
              value={totalLeads}
              icon={Users}
              color="violet"
              changeText="Across all franchises"
            />
            <StatCard
              label="Avg Commission"
              value={`${avgCommission}%`}
              icon={Percent}
              color="gold"
              changeText="Excludes Head Office"
            />
          </div>

          {/* ═══════════ Franchises table ═══════════ */}
          <div className="mt-6">
            <FranchisesTable franchises={franchises} />
          </div>
        </>
      )}
    </div>
  );
}
