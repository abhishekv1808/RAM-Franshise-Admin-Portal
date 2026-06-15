"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Loader2, AlertCircle } from "lucide-react";

import { recordPayment } from "@/app/dashboard/payments/actions";
import {
  recordPaymentSchema,
  PAYMENT_METHODS,
  type RecordPaymentInput,
} from "@/app/dashboard/payments/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Franchise = { id: string; name: string; code: string };

export function RecordPaymentForm({
  franchises,
  lockedFranchiseId,
}: {
  franchises: Franchise[];
  lockedFranchiseId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RecordPaymentInput>({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: {
      franchiseId: lockedFranchiseId ?? "",
      amount: undefined as unknown as number,
      method: "upi",
      paidAt: today,
      clientName: "",
      notes: "",
    },
  });

  async function onSubmit(values: RecordPaymentInput) {
    setFormError(null);
    const res = await recordPayment(values);
    if (res.ok) {
      reset({ franchiseId: lockedFranchiseId ?? "", amount: undefined as unknown as number, method: "upi", paidAt: today, clientName: "", notes: "" });
      setOpen(false);
      router.refresh();
      return;
    }
    if (res.field) setError(res.field, { message: res.error });
    else setFormError(res.error);
  }

  const inputCls = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30";

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-brand-navy hover:bg-brand-navy/90">
        <Plus className="h-4 w-4" /> Record Payment
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !isSubmitting && setOpen(false)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-brand-navy">Record Payment</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Records a <span className="font-medium">pending</span> payment. A super admin verifies it before it counts.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4" noValidate>
              {formError && (
                <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {formError}
                </div>
              )}

              {!lockedFranchiseId && (
                <Field label="Franchise" error={errors.franchiseId?.message}>
                  <select className={inputCls} {...register("franchiseId")}>
                    <option value="">Choose a franchise…</option>
                    {franchises.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.code})
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Field label="Amount (₹)" error={errors.amount?.message}>
                  <Input type="number" min="1" step="0.01" placeholder="10000" {...register("amount", { valueAsNumber: true })} />
                </Field>
                <Field label="Method" error={errors.method?.message}>
                  <select className={inputCls} {...register("method")}>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.key} value={m.key}>{m.label}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Date paid" error={errors.paidAt?.message}>
                  <Input type="date" {...register("paidAt")} />
                </Field>
                <Field label="Client name" error={errors.clientName?.message}>
                  <Input placeholder="Optional" {...register("clientName")} />
                </Field>
              </div>

              <Field label="Notes" error={errors.notes?.message}>
                <Input placeholder="Optional" {...register("notes")} />
              </Field>

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-brand-navy hover:bg-brand-navy/90" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Record"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
