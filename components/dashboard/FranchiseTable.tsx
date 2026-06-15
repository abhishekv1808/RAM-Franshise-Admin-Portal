"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, RefreshCw, ArrowRight, ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type FranchiseRow = {
  id: string;
  name: string | null;
  code: string | null;
  city: string | null;
  status: string;
  total: number;
  conversion: number;
};

/**
 * Franchise List table — mirrors the reference "Product List" card:
 * count header, live search box, refresh button, and a styled table with
 * a read-only active toggle in the last column.
 */
export function FranchiseTable({ rows }: { rows: FranchiseRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const q = query.trim().toLowerCase();
  const filtered = q
    ? rows.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.code?.toLowerCase().includes(q) ||
          r.city?.toLowerCase().includes(q),
      )
    : rows;
  const shown = filtered.slice(0, 6);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/40 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* Header: title + count */}
      <div className="flex items-center justify-between px-6 pt-5">
        <div>
          <p className="font-heading text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
            Franchise List
          </p>
          <div className="mt-1 flex items-end gap-2">
            <span className="font-heading text-2xl font-extrabold leading-none text-foreground">
              {rows.length}
            </span>
            <span className="mb-0.5 text-[12px] font-medium text-muted-foreground/60">franchises</span>
          </div>
        </div>
        <Link
          href="/dashboard/franchises"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-brand-navy"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Search + refresh */}
      <div className="flex items-center gap-2.5 px-6 py-4">
        <label className="flex flex-1 items-center gap-2.5 rounded-xl border border-border/50 bg-muted/30 px-3.5 py-2 transition-all duration-200 focus-within:border-brand-navy/20 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(27,58,107,0.06)]">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground/50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Search franchises…"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/40"
          />
        </label>
        <button
          onClick={() => startTransition(() => router.refresh())}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border/50 bg-white px-3.5 py-2 text-[13px] font-semibold text-muted-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-150 hover:border-border hover:text-foreground"
        >
          <RefreshCw className={cn("h-4 w-4", pending && "animate-spin")} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 px-1">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/20 hover:bg-transparent">
              <TableHead className="pl-5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">Franchise</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">City</TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">Leads</TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">Conv.</TableHead>
              <TableHead className="pr-5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-10 text-center text-[13px] text-muted-foreground/50">
                  No franchises match “{query}”.
                </TableCell>
              </TableRow>
            ) : (
              shown.map((f) => {
                const active = f.status === "active";
                return (
                  <TableRow key={f.id} className="border-b border-border/10 transition-colors hover:bg-muted/20">
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-navy/10 to-brand-navy/[0.03] text-[11px] font-bold text-brand-navy ring-1 ring-brand-navy/[0.06]">
                          {f.name?.charAt(0) ?? "F"}
                        </span>
                        <div className="min-w-0">
                          <span className="block truncate text-[13px] font-semibold text-foreground">{f.name}</span>
                          <span className="block font-mono text-[10px] tracking-wide text-muted-foreground/50">{f.code}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">{f.city ?? "—"}</TableCell>
                    <TableCell className="text-right text-[13px] font-semibold tabular-nums">{f.total}</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-[13px] font-medium tabular-nums",
                          f.conversion > 30 ? "text-emerald-600" : f.conversion > 0 ? "text-amber-600" : "text-muted-foreground/50",
                        )}
                      >
                        {f.conversion > 0 && <ArrowUpRight className="h-3 w-3" />}
                        {f.conversion}%
                      </span>
                    </TableCell>
                    <TableCell className="pr-5">
                      <div className="flex justify-end">
                        <span
                          title={active ? "Active" : f.status}
                          className={cn(
                            "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200",
                            active ? "bg-emerald-500" : "bg-slate-200",
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                              active ? "translate-x-[18px]" : "translate-x-0.5",
                            )}
                          />
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {filtered.length > 6 && (
        <div className="flex justify-center border-t border-border/20 py-3">
          <Link
            href="/dashboard/franchises"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground/60 transition-colors hover:text-brand-navy"
          >
            Show all {rows.length} franchises
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
