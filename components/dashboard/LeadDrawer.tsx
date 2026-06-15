"use client";

import { useEffect, useState } from "react";
import {
  X,
  Loader2,
  Phone,
  Mail,
  Building2,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRightLeft,
  Copy,
} from "lucide-react";

import {
  getLeadDetail,
  saveLeadNotes,
  reassignLead,
  updateLeadStatus,
} from "@/app/dashboard/leads/actions";
import {
  LEAD_STATUSES,
  type LeadStatus,
  type LeadDetail,
  type LeadActivity,
  type LeadDuplicate,
} from "@/app/dashboard/leads/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Franchise = { id: string; name: string; code: string };

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function describe(a: LeadActivity): string {
  const d = a.details ?? {};
  switch (a.action) {
    case "lead_routed":
      return `Routed to ${d.franchise_code ?? "?"} (${String(d.reason ?? "").replace(/_/g, " ")})`;
    case "status_changed":
      return `Status: ${d.from} → ${d.to}`;
    case "lead_reassigned":
      return `Reassigned ${d.from_franchise ?? "?"} → ${d.to_franchise ?? "?"}`;
    default:
      return a.action.replace(/_/g, " ");
  }
}

export function LeadDrawer({
  leadId,
  franchises,
  canReassign,
  onClose,
  onUpdated,
  onOpenLead,
}: {
  leadId: string;
  franchises: Franchise[];
  canReassign: boolean;
  onClose: () => void;
  onUpdated: (patch: Partial<{
    work_status: string;
    franchise_id: string;
    franchise_name: string;
    franchise_code: string;
  }>) => void;
  onOpenLead: (id: string) => void;
}) {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [timeline, setTimeline] = useState<LeadActivity[]>([]);
  const [duplicates, setDuplicates] = useState<LeadDuplicate[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [notes, setNotes] = useState("");
  const [notesState, setNotesState] = useState<"idle" | "saving" | "saved">("idle");
  const [statusBusy, setStatusBusy] = useState(false);
  const [reassignTo, setReassignTo] = useState("");
  const [reassignBusy, setReassignBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLead(null);
    setLoadError(null);
    getLeadDetail(leadId).then((res) => {
      if (!active) return;
      if (res.ok) {
        setLead(res.lead);
        setTimeline(res.timeline);
        setDuplicates(res.duplicates);
        setNotes(res.lead.notes ?? "");
      } else {
        setLoadError(res.error);
      }
    });
    return () => {
      active = false;
    };
  }, [leadId]);

  async function changeStatus(to: LeadStatus) {
    if (!lead || to === lead.work_status) return;
    const from = lead.work_status;
    setStatusBusy(true);
    setActionError(null);
    const res = await updateLeadStatus(lead.id, from, to);
    setStatusBusy(false);
    if (res.ok) {
      setLead({ ...lead, work_status: to });
      onUpdated({ work_status: to });
      setTimeline((t) => [
        { id: `local-${Date.now()}`, action: "status_changed", details: { from, to }, created_at: new Date().toISOString() },
        ...t,
      ]);
    } else {
      setActionError(res.error);
    }
  }

  async function save() {
    if (!lead) return;
    setNotesState("saving");
    setActionError(null);
    const res = await saveLeadNotes(lead.id, notes);
    if (res.ok) {
      setNotesState("saved");
      setTimeout(() => setNotesState("idle"), 1500);
    } else {
      setNotesState("idle");
      setActionError(res.error);
    }
  }

  async function doReassign() {
    if (!lead || !reassignTo) return;
    setReassignBusy(true);
    setActionError(null);
    const res = await reassignLead(lead.id, reassignTo);
    setReassignBusy(false);
    if (res.ok) {
      setLead({ ...lead, franchise_id: res.franchiseId, franchise_name: res.franchiseName, franchise_code: res.franchiseCode });
      onUpdated({ franchise_id: res.franchiseId, franchise_name: res.franchiseName, franchise_code: res.franchiseCode });
      setReassignTo("");
      setTimeline((t) => [
        { id: `local-${Date.now()}`, action: "lead_reassigned", details: { to_franchise: res.franchiseCode }, created_at: new Date().toISOString() },
        ...t,
      ]);
    } else {
      setActionError(res.error);
    }
  }

  const selectCls =
    "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-card shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-card px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-brand-navy">
              {lead?.full_name ?? "Lead"}
            </p>
            {lead && (
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded bg-brand-navy/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-navy">
                  <Building2 className="h-3 w-3" /> {lead.franchise_code ?? "Unassigned"}
                </span>
                {lead.source && (
                  <Badge variant="outline" className="border-transparent bg-muted capitalize text-muted-foreground">
                    {lead.source.replace(/_/g, " ")}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loadError ? (
          <div className="m-5 flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {loadError}
          </div>
        ) : !lead ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="flex-1 space-y-6 px-5 py-5">
            {actionError && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {actionError}
              </div>
            )}

            {/* Possible duplicate (RLS-scoped: franchise admin only sees own-franchise matches) */}
            {duplicates.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50/60 p-3">
                <p className="flex items-center gap-1.5 text-sm font-medium text-amber-800">
                  <Copy className="h-4 w-4" />
                  Possible duplicate — this number has {duplicates.length} other{" "}
                  {duplicates.length === 1 ? "enquiry" : "enquiries"}
                </p>
                <ul className="mt-2 space-y-1">
                  {duplicates.map((d) => (
                    <li key={d.id}>
                      <button
                        onClick={() => onOpenLead(d.id)}
                        className="text-left text-sm text-amber-900 underline underline-offset-2 hover:no-underline"
                      >
                        {d.full_name} · {d.work_status.replace(/_/g, " ")}
                        {d.franchise_code ? ` · ${d.franchise_code}` : ""}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Contact */}
            <section className="space-y-2 text-sm">
              <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-foreground hover:text-brand-navy">
                <Phone className="h-4 w-4 text-muted-foreground" /> {lead.phone}
              </a>
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-foreground hover:text-brand-navy">
                  <Mail className="h-4 w-4 text-muted-foreground" /> {lead.email}
                </a>
              )}
              <p className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" /> Created {fmtDateTime(lead.created_at)}
              </p>
            </section>

            {/* Service + message */}
            <section className="space-y-3">
              {lead.service_interested && (
                <Field label="Service interested">{lead.service_interested}</Field>
              )}
              {lead.message && (
                <Field label="Message">
                  <p className="whitespace-pre-wrap text-sm text-foreground">{lead.message}</p>
                </Field>
              )}
            </section>

            {/* Status */}
            <section>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Status</label>
              <select
                value={lead.work_status}
                disabled={statusBusy}
                onChange={(e) => changeStatus(e.target.value as LeadStatus)}
                className={selectCls}
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </section>

            {/* Reassign — super admin only */}
            {canReassign && (
              <section>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Reassign to franchise
                </label>
                <div className="flex gap-2">
                  <select value={reassignTo} onChange={(e) => setReassignTo(e.target.value)} className={selectCls}>
                    <option value="">Choose franchise…</option>
                    {franchises
                      .filter((f) => f.id !== lead.franchise_id)
                      .map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.code})
                        </option>
                      ))}
                  </select>
                  <Button onClick={doReassign} disabled={!reassignTo || reassignBusy} className="shrink-0 bg-brand-navy hover:bg-brand-navy/90">
                    {reassignBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
                    Reassign
                  </Button>
                </div>
              </section>
            )}

            {/* Notes */}
            <section>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Internal notes about this lead…"
                className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
              <div className="mt-2 flex items-center gap-2">
                <Button onClick={save} disabled={notesState === "saving"} variant="outline" size="sm">
                  {notesState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save notes
                </Button>
                {notesState === "saved" && (
                  <span className="flex items-center gap-1 text-xs text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                  </span>
                )}
              </div>
            </section>

            {/* Activity timeline */}
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Activity
              </h3>
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <ol className="space-y-3 border-l border-border pl-4">
                  {timeline.map((a) => (
                    <li key={a.id} className="relative">
                      <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-brand-navy/40" />
                      <p className="text-sm text-foreground">{describe(a)}</p>
                      <p className="text-xs text-muted-foreground">{fmtDateTime(a.created_at)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm text-foreground">{children}</div>
    </div>
  );
}
