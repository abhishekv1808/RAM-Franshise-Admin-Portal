import Link from "next/link";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActivityFilters } from "@/components/dashboard/ActivityFilters";
import { describeActivity, actionsForGroup, type ActivityRecord } from "@/lib/activity";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

function timeSince(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string; type?: string; from?: string; to?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const supabase = await createClient();

  // RLS scopes this to the viewer (super_admin = all; a franchise_admin would
  // only ever see their own — though middleware keeps them out of /dashboard).
  let q = supabase
    .from("activity_logs")
    .select("id, action, entity_type, entity_id, details, actor_id, created_at, franchises(code)", {
      count: "exact",
    })
    .order("created_at", { ascending: false });

  if (sp.f) q = q.eq("franchise_id", sp.f);
  const actions = actionsForGroup(sp.type);
  if (actions) q = q.in("action", actions);
  if (sp.from) q = q.gte("created_at", `${sp.from}T00:00:00`);
  if (sp.to) q = q.lte("created_at", `${sp.to}T23:59:59.999`);

  const { data: raw, count } = await q.range(offset, offset + PAGE_SIZE - 1);
  const logs = raw ?? [];

  // Resolve actor names + payment amounts for this page (no FK embeds for these).
  const actorIds = [...new Set(logs.map((l) => l.actor_id).filter(Boolean))] as string[];
  const payIds = [...new Set(logs.filter((l) => l.entity_type === "payment").map((l) => l.entity_id).filter(Boolean))] as string[];
  const [{ data: actors }, { data: pays }] = await Promise.all([
    actorIds.length ? supabase.from("profiles").select("id, full_name, email").in("id", actorIds) : Promise.resolve({ data: [] }),
    payIds.length ? supabase.from("payments").select("id, amount").in("id", payIds) : Promise.resolve({ data: [] }),
  ]);
  const actorMap = new Map((actors ?? []).map((a) => [a.id, a.full_name || a.email || "—"]));
  const payMap = new Map((pays ?? []).map((p) => [p.id, Number(p.amount)]));

  const { data: franchises } = await supabase.from("franchises").select("id, name, code").order("created_at");

  const rows: (ActivityRecord & { paymentAmount: number | null })[] = logs.map((l) => ({
    id: l.id,
    action: l.action,
    entity_type: l.entity_type,
    entity_id: l.entity_id,
    details: l.details,
    created_at: l.created_at,
    franchise_code: (l.franchises as unknown as { code: string } | null)?.code ?? null,
    actor_name: l.actor_id ? actorMap.get(l.actor_id) ?? "—" : "System",
    paymentAmount: l.entity_id ? payMap.get(l.entity_id) ?? null : null,
  }));

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageLink = (p: number) => {
    const params = new URLSearchParams();
    if (sp.f) params.set("f", sp.f);
    if (sp.type) params.set("type", sp.type);
    if (sp.from) params.set("from", sp.from);
    if (sp.to) params.set("to", sp.to);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/dashboard/activity?${qs}` : "/dashboard/activity";
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <PageHeader description={`${total} ${total === 1 ? "event" : "events"} across all franchises — newest first.`} />

      <ActivityFilters franchises={franchises ?? []} current={sp} />

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-muted-foreground">
              <Inbox className="h-6 w-6" />
              No activity matches these filters.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => {
                const { icon: Icon, text } = describeActivity(r, r.paymentAmount);
                return (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-navy/5 text-brand-navy">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">{text}</p>
                      <p className="text-xs text-muted-foreground">by {r.actor_name}</p>
                    </div>
                    {r.franchise_code && (
                      <Badge variant="outline" className="hidden border-transparent bg-brand-navy/10 font-mono text-[10px] text-brand-navy sm:inline-flex">
                        {r.franchise_code}
                      </Badge>
                    )}
                    <span
                      className="shrink-0 text-xs text-muted-foreground"
                      title={new Date(r.created_at).toLocaleString("en-IN")}
                    >
                      {timeSince(r.created_at)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <PagerLink href={pageLink(page - 1)} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </PagerLink>
            <PagerLink href={pageLink(page + 1)} disabled={page >= totalPages}>
              Next <ChevronRight className="h-4 w-4" />
            </PagerLink>
          </div>
        </div>
      )}
    </div>
  );
}

function PagerLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  if (disabled) {
    return (
      <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-border px-3 py-1.5 text-muted-foreground/40">
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-foreground transition-colors hover:bg-muted">
      {children}
    </Link>
  );
}
