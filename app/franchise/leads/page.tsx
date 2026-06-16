import { Users, UserPlus, Loader, CheckCircle2 } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/ui/stat-card";
import { LeadsTable } from "@/components/dashboard/LeadsTable";
import type { LeadCard } from "@/app/dashboard/leads/schema";

export const dynamic = "force-dynamic";

const CLOSED = new Set(["completed", "closed"]);
const OPEN = new Set(["new", "contacted", "documents_pending", "in_progress"]);

export default async function FranchiseLeadsPage() {
  const supabase = await createClient();

  // NO manual franchise filter — RLS scopes this to the admin's own leads.
  // That is precisely what proves isolation: HQ's leads can never appear here.
  const { data: leadsRaw } = await supabase
    .from("leads")
    .select(
      "id, full_name, phone, email, service_interested, source, pincode, work_status, created_at, franchise_id, franchises(name, code)"
    )
    .order("created_at", { ascending: false });

  const leads: LeadCard[] = (leadsRaw ?? []).map((l) => {
    const lf = l.franchises as unknown as { name: string; code: string } | null;
    return {
      id: l.id,
      full_name: l.full_name,
      phone: l.phone,
      email: l.email,
      service_interested: l.service_interested,
      source: l.source,
      pincode: l.pincode,
      work_status: l.work_status,
      created_at: l.created_at,
      franchise_id: l.franchise_id,
      franchise_name: lf?.name ?? null,
      franchise_code: lf?.code ?? null,
    };
  });

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const total = leads.length;
  const newThisMonth = leads.filter((l) => new Date(l.created_at) >= monthStart).length;
  const open = leads.filter((l) => OPEN.has(l.work_status)).length;
  const converted = leads.filter((l) => CLOSED.has(l.work_status)).length;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-7 lg:px-8">
      <div className="mb-6">
        <h2 className="font-heading text-xl font-bold tracking-tight text-brand-navy">My Leads</h2>
        <p className="mt-1 text-sm text-muted-foreground/70">
          Your franchise&apos;s pipeline — search, filter, and open a lead to manage it.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
        <StatCard label="Total Leads" value={total} icon={Users} color="navy" changeText="All time" />
        <StatCard
          label="New This Month"
          value={newThisMonth}
          icon={UserPlus}
          color="emerald"
          changeText={newThisMonth > 0 ? `+${newThisMonth} added` : "None yet"}
        />
        <StatCard label="In Pipeline" value={open} icon={Loader} color="violet" changeText="Open & in progress" />
        <StatCard label="Converted" value={converted} icon={CheckCircle2} color="gold" changeText="Completed or closed" />
      </div>

      <div className="mt-6">
        <LeadsTable
          leads={leads}
          franchises={[]}
          showFranchiseFilter={false}
          basePath="/franchise/leads"
        />
      </div>
    </div>
  );
}
