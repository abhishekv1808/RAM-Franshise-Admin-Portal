"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Search, Plus, ChevronRight, ArrowUpRight } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type FranchiseRow = {
  id: string;
  name: string;
  code: string;
  city: string | null;
  status: string;
  commission_percent: number;
  contact_email: string | null;
  created_at: string;
  leadCount: number;
};

const HQ_CODE = "HQ";

type StatusFilter = "all" | "active" | "inactive";

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent px-2.5 py-0.5 text-[11px] font-semibold capitalize",
        isActive ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
      )}
    >
      <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", isActive ? "bg-emerald-500" : "bg-amber-500")} />
      {status}
    </Badge>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-navy/10 to-brand-navy/[0.03] ring-1 ring-brand-navy/[0.06]">
        <Building2 className="h-6 w-6 text-brand-navy/60" />
      </div>
      <p className="font-heading text-base font-bold text-foreground">No franchises yet</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground/70">
        Add your first franchise to start assigning territories and admins.
      </p>
      <Link
        href="/dashboard/franchises/new"
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-navy px-4 py-2 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(27,58,107,0.25)] transition-all duration-150 hover:bg-brand-navy/90 active:scale-[0.97]"
      >
        <Plus className="h-4 w-4" />
        Add Franchise
      </Link>
    </div>
  );
}

export function FranchisesTable({ franchises }: { franchises: FranchiseRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  const counts = useMemo(
    () => ({
      all: franchises.length,
      active: franchises.filter((f) => f.status === "active").length,
      inactive: franchises.filter((f) => f.status !== "active").length,
    }),
    [franchises],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return franchises.filter((f) => {
      const matchesStatus =
        filter === "all" || (filter === "active" ? f.status === "active" : f.status !== "active");
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        f.code.toLowerCase().includes(q) ||
        f.city?.toLowerCase().includes(q) ||
        f.contact_email?.toLowerCase().includes(q)
      );
    });
  }, [franchises, query, filter]);

  if (franchises.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-border/40 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/40 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3 border-b border-border/30 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Status filter segmented control */}
        <div className="flex items-center gap-1 rounded-xl bg-muted/40 p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all duration-150",
                filter === f.key
                  ? "bg-white text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                  : "text-muted-foreground/60 hover:text-foreground",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10px] tabular-nums",
                  filter === f.key ? "bg-muted/60 text-muted-foreground" : "bg-transparent text-muted-foreground/50",
                )}
              >
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <label className="flex w-full items-center gap-2.5 rounded-xl border border-border/50 bg-muted/30 px-3.5 py-2 transition-all duration-200 focus-within:border-brand-navy/20 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(27,58,107,0.06)] lg:w-64">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground/50" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Search franchises…"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/40"
            />
          </label>
          <Link
            href="/dashboard/franchises/new"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-navy px-4 py-2 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(27,58,107,0.25)] transition-all duration-150 hover:bg-brand-navy/90 active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Franchise</span>
          </Link>
        </div>
      </div>

      {/* ── Table ── */}
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/20 hover:bg-transparent">
            <TableHead className="pl-5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">Franchise</TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">City</TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">Status</TableHead>
            <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">Commission</TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">Contact</TableHead>
            <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">Leads</TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">Created</TableHead>
            <TableHead className="pr-5" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={8} className="py-16 text-center text-[13px] text-muted-foreground/50">
                No franchises match your filters.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((f) => {
              const isHQ = f.code === HQ_CODE;
              return (
                <TableRow
                  key={f.id}
                  onClick={() => router.push(`/dashboard/franchises/${f.id}`)}
                  className="group/row cursor-pointer border-b border-border/10 transition-colors hover:bg-muted/20"
                >
                  <TableCell className="pl-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-navy/10 to-brand-navy/[0.03] text-[12px] font-bold text-brand-navy ring-1 ring-brand-navy/[0.06]">
                        {f.name?.charAt(0) ?? "F"}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[13px] font-semibold text-foreground">{f.name}</span>
                          {isHQ && (
                            <Badge
                              variant="outline"
                              className="border-brand-gold/40 bg-brand-gold/10 text-[10px] font-semibold uppercase tracking-wide text-brand-navy"
                              title="Head Office — the unassigned lead pool, not a real franchise"
                            >
                              HQ
                            </Badge>
                          )}
                        </div>
                        <span className="block font-mono text-[10px] tracking-wide text-muted-foreground/50">{f.code}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-[13px] text-muted-foreground">{f.city ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={f.status} />
                  </TableCell>
                  <TableCell className="text-right text-[13px] tabular-nums text-muted-foreground">
                    {f.commission_percent}%
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-[13px] text-muted-foreground">
                    {f.contact_email ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[13px] font-semibold tabular-nums",
                        f.leadCount > 0 ? "text-foreground" : "text-muted-foreground/50",
                      )}
                    >
                      {f.leadCount > 0 && <ArrowUpRight className="h-3 w-3 text-emerald-500" />}
                      {f.leadCount}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-[13px] text-muted-foreground/80">
                    {formatDate(f.created_at)}
                  </TableCell>
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
  );
}
