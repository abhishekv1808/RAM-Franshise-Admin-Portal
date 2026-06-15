"use client";

import { useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export type PerfRow = {
  code: string;
  name: string;
  leads: number;
  converted: number;
  conversion: number;
  revenue: number;
  commissionEarned: number;
  owed: number;
};

type SortKey = keyof Omit<PerfRow, "code" | "name">;

const COLS: { key: SortKey; label: string; money?: boolean; pct?: boolean }[] = [
  { key: "leads", label: "Leads" },
  { key: "converted", label: "Converted" },
  { key: "conversion", label: "Conv %", pct: true },
  { key: "revenue", label: "Revenue", money: true },
  { key: "commissionEarned", label: "Commission", money: true },
  { key: "owed", label: "Owed", money: true },
];

export function FranchisePerformanceTable({ rows }: { rows: PerfRow[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "revenue", dir: "desc" });

  const sorted = [...rows].sort((a, b) => {
    const d = a[sort.key] - b[sort.key];
    return sort.dir === "asc" ? d : -d;
  });

  function toggle(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Franchise</TableHead>
          {COLS.map((c) => (
            <TableHead key={c.key} className="text-right">
              <button onClick={() => toggle(c.key)} className="ml-auto inline-flex items-center gap-1 hover:text-foreground">
                {c.label}
                {sort.key === c.key ? (
                  sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                ) : (
                  <ArrowUpDown className="h-3 w-3 opacity-40" />
                )}
              </button>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((r) => (
          <TableRow key={r.code}>
            <TableCell>
              <span className="font-medium text-foreground">{r.name}</span>
              <span className="ml-2 font-mono text-xs text-muted-foreground">{r.code}</span>
            </TableCell>
            <TableCell className="text-right tabular-nums">{r.leads}</TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">{r.converted}</TableCell>
            <TableCell className="text-right tabular-nums">{r.conversion}%</TableCell>
            <TableCell className="text-right tabular-nums">{formatINR(r.revenue)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatINR(r.commissionEarned)}</TableCell>
            <TableCell className="text-right tabular-nums">
              <span className={cn(r.owed < 0 ? "text-rose-600" : r.owed > 0 ? "text-brand-navy" : "text-muted-foreground")}>
                {formatINR(r.owed)}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
