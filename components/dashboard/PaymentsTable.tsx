"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Ban, Undo2, Lock, Loader2, AlertCircle } from "lucide-react";

import { verifyPayment, cancelPayment, refundPayment } from "@/app/dashboard/payments/actions";
import type { PaymentRow } from "@/app/dashboard/payments/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function StatusBadge({ row }: { row: PaymentRow }) {
  if (row.kind === "reversal")
    return <Badge variant="outline" className="border-transparent bg-rose-50 text-rose-700">Reversal</Badge>;
  const map: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    verified: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-muted text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={cn("border-transparent capitalize", map[row.status] ?? "bg-muted")}>
      {row.status}
    </Badge>
  );
}

export function PaymentsTable({
  rows,
  reversedIds,
  canManage,
}: {
  rows: PaymentRow[];
  reversedIds: string[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ type: "cancel" | "refund"; id: string } | null>(null);
  const [reason, setReason] = useState("Refund");
  const reversed = new Set(reversedIds);

  async function exec(id: string, fn: () => Promise<{ ok: boolean; error?: string }>, closeDialog = false) {
    setBusy(id);
    setError(null);
    const res = await fn();
    setBusy(null);
    if (res.ok) {
      if (closeDialog) setDialog(null);
      router.refresh();
    } else {
      setError(res.error ?? "Action failed");
    }
  }

  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No payments recorded yet.</p>;
  }

  return (
    <div>
      {error && !dialog && (
        <div className="mb-3 flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Date</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Franchise</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Commission</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Status</TableHead>
            {canManage && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const isReversal = r.kind === "reversal";
            const neg = isReversal ? "−" : "";
            const isReversed = reversed.has(r.id);
            const isSettled = !!r.settlement_id;
            const canRefund = canManage && !isReversal && r.status === "verified" && !isReversed && !isSettled;
            const canPend = canManage && r.status === "pending";
            return (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(r.paid_at)}</TableCell>
                <TableCell className="text-foreground">{r.client_name ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{r.franchise_code ?? "—"}</TableCell>
                <TableCell className={cn("text-right tabular-nums", isReversal && "text-rose-600")}>
                  {neg}{formatINR(r.amount)}
                </TableCell>
                <TableCell className={cn("text-right tabular-nums text-muted-foreground", isReversal && "text-rose-600")}>
                  {neg}{formatINR(r.commission_amount)}
                </TableCell>
                <TableCell className="capitalize text-muted-foreground">
                  {r.payment_method?.replace(/_/g, " ") ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge row={r} />
                    {isSettled && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground">
                        <Lock className="h-3 w-3" /> settled
                      </span>
                    )}
                    {isReversed && <span className="text-[10px] font-medium text-rose-600">refunded</span>}
                  </div>
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    {busy === r.id && !dialog ? (
                      <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <div className="flex justify-end gap-1">
                        {canPend && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 gap-1 text-emerald-700"
                              onClick={() => exec(r.id, () => verifyPayment(r.id))}>
                              <Check className="h-3.5 w-3.5" /> Verify
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 gap-1 text-muted-foreground"
                              onClick={() => { setError(null); setDialog({ type: "cancel", id: r.id }); }}>
                              <Ban className="h-3.5 w-3.5" /> Cancel
                            </Button>
                          </>
                        )}
                        {canRefund && (
                          <Button size="sm" variant="outline" className="h-7 gap-1 text-rose-700"
                            onClick={() => { setError(null); setReason("Refund"); setDialog({ type: "refund", id: r.id }); }}>
                            <Undo2 className="h-3.5 w-3.5" /> Refund
                          </Button>
                        )}
                        {!canPend && !canRefund && <span className="text-xs text-muted-foreground/50">—</span>}
                      </div>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={!!dialog}
        tone="danger"
        title={dialog?.type === "refund" ? "Refund this payment?" : "Cancel this payment?"}
        description={
          dialog?.type === "refund"
            ? "This creates a reversal entry — the original record stays intact and the commission is reversed in the ledger."
            : "This cancels a pending payment. It will not count toward revenue or commission."
        }
        confirmLabel={dialog?.type === "refund" ? "Confirm refund" : "Cancel payment"}
        busy={!!dialog && busy === dialog.id}
        error={dialog ? error : null}
        input={
          dialog?.type === "refund"
            ? { label: "Reason", placeholder: "Reason for refund", value: reason, onChange: setReason, required: true }
            : undefined
        }
        onConfirm={() => {
          if (!dialog) return;
          const id = dialog.id;
          const fn =
            dialog.type === "refund"
              ? () => refundPayment(id, reason || "Refund")
              : () => cancelPayment(id);
          exec(id, fn, true);
        }}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}
