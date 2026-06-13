"use client";

import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";

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

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent font-medium capitalize",
        isActive
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700"
      )}
    >
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-navy/5">
        <Building2 className="h-6 w-6 text-brand-navy/60" />
      </div>
      <p className="font-semibold text-brand-navy">No franchises yet</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Add your first franchise to start assigning territories and admins.
      </p>
    </div>
  );
}

export function FranchisesTable({ franchises }: { franchises: FranchiseRow[] }) {
  const router = useRouter();

  if (franchises.length === 0) return <EmptyState />;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead>Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Commission</TableHead>
            <TableHead>Contact Email</TableHead>
            <TableHead className="text-right">Leads</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {franchises.map((f) => {
            const isHQ = f.code === HQ_CODE;
            return (
              <TableRow
                key={f.id}
                onClick={() => router.push(`/dashboard/franchises/${f.id}`)}
                className="cursor-pointer"
              >
                <TableCell className="font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    {f.name}
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
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {f.code}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {f.city ?? "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={f.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {f.commission_percent}%
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {f.contact_email ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums text-foreground">
                  {f.leadCount}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDate(f.created_at)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
