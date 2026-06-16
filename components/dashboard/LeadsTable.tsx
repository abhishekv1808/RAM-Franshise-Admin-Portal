"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Building2, Inbox } from "lucide-react";

import {
  LEAD_STATUSES,
  LEAD_SOURCES,
  type LeadCard,
} from "@/app/dashboard/leads/schema";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Franchise = { id: string; name: string; code: string };
type SortKey = "full_name" | "work_status" | "created_at";

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-50 text-blue-700",
  contacted: "bg-indigo-50 text-indigo-700",
  documents_pending: "bg-amber-50 text-amber-700",
  in_progress: "bg-orange-50 text-orange-700",
  completed: "bg-emerald-50 text-emerald-700",
  closed: "bg-slate-100 text-slate-600",
};

const STATUS_DOT: Record<string, string> = {
  new: "bg-blue-500",
  contacted: "bg-indigo-500",
  documents_pending: "bg-amber-500",
  in_progress: "bg-orange-500",
  completed: "bg-emerald-500",
  closed: "bg-slate-400",
};

const SOURCE_STYLES: Record<string, string> = {
  website: "bg-blue-50 text-blue-700",
  whatsapp: "bg-emerald-50 text-emerald-700",
  google: "bg-amber-50 text-amber-700",
  walk_in: "bg-purple-50 text-purple-700",
  referral: "bg-pink-50 text-pink-700",
};

const STATUS_LABEL = Object.fromEntries(LEAD_STATUSES.map((s) => [s.key, s.label]));

function statusKey(s: string | null) {
  return (s ?? "").toLowerCase().replace(/\s+/g, "_");
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function LeadStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent px-2.5 py-0.5 text-[11px] font-semibold capitalize",
        STATUS_STYLES[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", STATUS_DOT[status] ?? "bg-slate-400")} />
      {STATUS_LABEL[status] ?? status.replace(/_/g, " ")}
    </Badge>
  );
}

export function LeadSourceBadge({ source }: { source: string | null }) {
  if (!source) return <span className="text-muted-foreground/40">—</span>;
  const key = statusKey(source);
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent text-[11px] font-medium capitalize", SOURCE_STYLES[key] ?? "bg-muted text-muted-foreground")}
    >
      {source.replace(/_/g, " ")}
    </Badge>
  );
}

export function LeadsTable({
  leads,
  franchises,
  showFranchiseFilter,
  basePath,
}: {
  leads: LeadCard[];
  franchises: Franchise[];
  showFranchiseFilter: boolean;
  basePath: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [franchise, setFranchise] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "created_at", dir: "desc" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = leads.filter((l) => {
      if (status !== "all" && l.work_status !== status) return false;
      if (source !== "all" && statusKey(l.source) !== source) return false;
      if (franchise !== "all" && l.franchise_id !== franchise) return false;
      if (!q) return true;
      return (
        l.full_name.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.pincode?.toLowerCase().includes(q) ||
        l.franchise_code?.toLowerCase().includes(q) ||
        l.service_interested?.toLowerCase().includes(q)
      );
    });

    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[sort.key] ?? "";
      const bv = b[sort.key] ?? "";
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }, [leads, query, status, source, franchise, sort]);

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "created_at" ? "desc" : "asc" }));
  }

  const SortIcon = ({ col }: { col: SortKey }) =>
    sort.key === col ? (
      sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
    ) : (
      <ArrowUpDown className="h-3 w-3 opacity-40" />
    );

  const selectCls =
    "h-9 rounded-xl border border-border/50 bg-muted/30 px-3 text-[13px] text-foreground outline-none transition-colors focus:border-brand-navy/20 focus:bg-white";

  return (
    <div className="overflow-hidden rounded-2xl border border-border/40 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-border/30 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <label className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-muted/30 px-3.5 py-2 transition-all duration-200 focus-within:border-brand-navy/20 focus-within:bg-white lg:w-72">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground/50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Search name, phone, email, pincode…"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/40"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls} aria-label="Filter by status">
            <option value="all">All statuses</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          <select value={source} onChange={(e) => setSource(e.target.value)} className={selectCls} aria-label="Filter by source">
            <option value="all">All sources</option>
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</option>
            ))}
          </select>
          {showFranchiseFilter && (
            <select value={franchise} onChange={(e) => setFranchise(e.target.value)} className={selectCls} aria-label="Filter by franchise">
              <option value="all">All franchises</option>
              {franchises.map((f) => (
                <option key={f.id} value={f.id}>{f.code}</option>
              ))}
            </select>
          )}
          <span className="ml-1 text-[13px] tabular-nums text-muted-foreground/60">
            {filtered.length} {filtered.length === 1 ? "lead" : "leads"}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/20 hover:bg-transparent">
              <TableHead className="pl-5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                <button onClick={() => toggleSort("full_name")} className="inline-flex items-center gap-1 hover:text-foreground">
                  Lead <SortIcon col="full_name" />
                </button>
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">Phone</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">Email</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">Source</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">Pincode</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">Franchise</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                <button onClick={() => toggleSort("work_status")} className="inline-flex items-center gap-1 hover:text-foreground">
                  Status <SortIcon col="work_status" />
                </button>
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                <button onClick={() => toggleSort("created_at")} className="inline-flex items-center gap-1 hover:text-foreground">
                  Created <SortIcon col="created_at" />
                </button>
              </TableHead>
              <TableHead className="pr-5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={9} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                    <Inbox className="h-6 w-6" />
                    <span className="text-[13px]">No leads match your filters.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((l) => {
                const isHQ = l.franchise_code === "HQ";
                return (
                  <TableRow
                    key={l.id}
                    onClick={() => router.push(`${basePath}/${l.id}`)}
                    className="group/row cursor-pointer border-b border-border/10 transition-colors hover:bg-muted/20"
                  >
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-navy/10 to-brand-navy/[0.03] text-[12px] font-bold text-brand-navy ring-1 ring-brand-navy/[0.06]">
                          {l.full_name?.charAt(0)?.toUpperCase() ?? "L"}
                        </span>
                        <div className="min-w-0">
                          <span className="block truncate text-[13px] font-semibold text-foreground">{l.full_name}</span>
                          {l.service_interested && (
                            <span className="block max-w-[180px] truncate text-[11px] text-muted-foreground/60">{l.service_interested}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-[13px] tabular-nums text-muted-foreground">{l.phone}</TableCell>
                    <TableCell className="max-w-[180px] truncate text-[13px] text-muted-foreground">{l.email ?? <span className="text-muted-foreground/40">—</span>}</TableCell>
                    <TableCell><LeadSourceBadge source={l.source} /></TableCell>
                    <TableCell className="font-mono text-[12px] text-muted-foreground">{l.pincode ?? <span className="text-muted-foreground/40">—</span>}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          isHQ ? "bg-brand-gold/15 text-brand-navy" : "bg-brand-navy/[0.07] text-brand-navy",
                        )}
                      >
                        <Building2 className="h-3 w-3" />
                        {l.franchise_code ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell><LeadStatusBadge status={l.work_status} /></TableCell>
                    <TableCell className="whitespace-nowrap text-[13px] text-muted-foreground/80">{fmtDate(l.created_at)}</TableCell>
                    <TableCell className="pr-5">
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 transition-all duration-150 group-hover/row:translate-x-0.5 group-hover/row:text-brand-navy" />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
