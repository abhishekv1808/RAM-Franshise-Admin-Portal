"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, FileSpreadsheet, Wallet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

import { recordSettlement } from "@/app/dashboard/reports/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Franchise = { id: string; name: string; code: string };

function monthBounds(month: string) {
  const [y, mo] = month.split("-").map(Number);
  const last = new Date(y, mo, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

export function SettlementPanel({ franchises }: { franchises: Franchise[] }) {
  const router = useRouter();
  const nowMonth = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 7);
  const [franchiseId, setFranchiseId] = useState("");
  const [month, setMonth] = useState(nowMonth);
  const [utr, setUtr] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const { from, to } = monthBounds(month);
  const ready = !!franchiseId;
  const dl = (format: string) =>
    `/dashboard/reports/settlement?franchise=${franchiseId}&from=${from}&to=${to}&format=${format}`;
  const inputCls = "h-9 rounded-md border border-input bg-white px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30";

  async function confirm() {
    setBusy(true);
    setResult(null);
    const res = await recordSettlement(franchiseId, from, to, utr);
    setBusy(false);
    if (res.ok) {
      setResult({ ok: true, msg: "Settlement recorded — the period's payments are now marked settled." });
      setConfirming(false);
      setUtr("");
      router.refresh();
    } else {
      setResult({ ok: false, msg: res.error });
    }
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-gold/15 to-brand-gold/[0.04] text-brand-gold ring-1 ring-brand-gold/[0.08]">
          <Wallet className="h-[18px] w-[18px]" />
        </span>
        <h2 className="font-heading text-base font-bold text-brand-navy">Settlement Statement</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Generate a branded statement for a franchise and month, then record the settlement.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Franchise</Label>
          <select className={inputCls} value={franchiseId} onChange={(e) => { setFranchiseId(e.target.value); setResult(null); setConfirming(false); }}>
            <option value="">Choose a franchise…</option>
            {franchises.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.code})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Month</Label>
          <input type="month" className={inputCls} value={month} onChange={(e) => { setMonth(e.target.value); setResult(null); setConfirming(false); }} />
        </div>

        <Button asChild variant="outline" disabled={!ready} className={!ready ? "pointer-events-none opacity-50" : ""}>
          <a href={ready ? dl("pdf") : undefined}>
            <FileText className="h-4 w-4" /> Download PDF
          </a>
        </Button>
        <Button asChild variant="outline" disabled={!ready} className={!ready ? "pointer-events-none opacity-50" : ""}>
          <a href={ready ? dl("xlsx") : undefined}>
            <FileSpreadsheet className="h-4 w-4" /> Download Excel
          </a>
        </Button>
      </div>

      {/* Record settlement */}
      {ready && (
        <div className="mt-4 border-t border-border pt-4">
          {!confirming ? (
            <Button onClick={() => { setConfirming(true); setResult(null); }} className="bg-brand-navy hover:bg-brand-navy/90">
              <Wallet className="h-4 w-4" /> Confirm &amp; Record Settlement
            </Button>
          ) : (
            <div className="rounded-md border border-brand-gold/40 bg-brand-gold/5 p-3">
              <p className="text-sm text-foreground">
                This records the settlement for this franchise &amp; month — the period&apos;s unsettled commission
                will be marked <span className="font-medium">settled</span>. Enter the bank transfer reference:
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Input value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="UTR / bank reference" className="h-9 w-56" />
                <Button onClick={confirm} disabled={busy} className="bg-brand-navy hover:bg-brand-navy/90">
                  {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Recording…</> : "Confirm settlement"}
                </Button>
                <Button variant="outline" onClick={() => setConfirming(false)} disabled={busy}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {result && (
        <p className={`mt-3 flex items-center gap-1.5 text-sm ${result.ok ? "text-emerald-700" : "text-destructive"}`}>
          {result.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {result.msg}
        </p>
      )}
    </div>
  );
}
