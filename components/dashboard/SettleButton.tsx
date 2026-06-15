"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";

import { settleCommission } from "@/app/dashboard/payments/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatINR } from "@/lib/format";

export function SettleButton({ franchiseId, owed }: { franchiseId: string; owed: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [utr, setUtr] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    const res = await settleCommission(franchiseId, utr);
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      setUtr("");
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-7 gap-1"
        disabled={owed === 0}
        onClick={() => { setError(null); setOpen(true); }}
        title={owed === 0 ? "Nothing to settle" : "Record a settlement"}
      >
        <Wallet className="h-3.5 w-3.5" /> Settle
      </Button>

      <ConfirmDialog
        open={open}
        title="Record settlement"
        description={
          <>
            This marks all unsettled commission for this franchise as settled
            {owed ? <> — <span className="font-medium text-foreground">{formatINR(owed)}</span></> : null}. Enter the bank transfer reference.
          </>
        }
        confirmLabel="Confirm settlement"
        busy={busy}
        error={error}
        input={{ label: "Bank reference (UTR)", placeholder: "e.g. AXIS0012345678", value: utr, onChange: setUtr }}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
