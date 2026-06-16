"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Building2,
  Clock,
  CalendarClock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRightLeft,
  Copy,
  Route,
  MessageSquare,
  StickyNote,
  Tag,
} from "lucide-react";

import {
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
import { LeadStatusBadge, LeadSourceBadge } from "@/components/dashboard/LeadsTable";
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
      return `Status changed: ${String(d.from ?? "").replace(/_/g, " ")} → ${String(d.to ?? "").replace(/_/g, " ")}`;
    case "lead_reassigned":
      return `Reassigned ${d.from_franchise ?? "?"} → ${d.to_franchise ?? "?"}`;
    default:
      return a.action.replace(/_/g, " ");
  }
}

/** Friendly routing explanation derived from the lead_routed audit entry. */
function routingInfo(timeline: LeadActivity[], franchiseCode: string | null) {
  const routed = timeline.find((a) => a.action === "lead_routed");
  const reason = String(routed?.details?.reason ?? "");
  if (reason === "pincode_match") return { label: "Matched by pincode", tone: "emerald" as const };
  if (reason === "no_match_hq_pool") return { label: "No franchise for this pincode → Head Office", tone: "amber" as const };
  if (reason === "no_pincode_hq_pool") return { label: "No pincode provided → Head Office", tone: "amber" as const };
  // No audit entry — infer from the assignment.
  if (franchiseCode === "HQ") return { label: "Head Office pool", tone: "amber" as const };
  if (franchiseCode) return { label: "Assigned to franchise", tone: "navy" as const };
  return { label: "Unassigned", tone: "slate" as const };
}

export function LeadDetailView({
  lead: initialLead,
  timeline: initialTimeline,
  duplicates,
  franchises,
  canReassign,
  basePath,
}: {
  lead: LeadDetail;
  timeline: LeadActivity[];
  duplicates: LeadDuplicate[];
  franchises: Franchise[];
  canReassign: boolean;
  basePath: string;
}) {
  const [lead, setLead] = useState(initialLead);
  const [timeline, setTimeline] = useState(initialTimeline);
  const [notes, setNotes] = useState(initialLead.notes ?? "");
  const [notesState, setNotesState] = useState<"idle" | "saving" | "saved">("idle");
  const [statusBusy, setStatusBusy] = useState(false);
  const [reassignTo, setReassignTo] = useState("");
  const [reassignBusy, setReassignBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isConsultation =
    lead.source === "Booking Widget" || (lead.message?.startsWith("Consultation booked") ?? false);
  const route = routingInfo(timeline, lead.franchise_code);

  async function changeStatus(to: LeadStatus) {
    if (to === lead.work_status) return;
    const from = lead.work_status;
    setStatusBusy(true);
    setActionError(null);
    const res = await updateLeadStatus(lead.id, from, to);
    setStatusBusy(false);
    if (res.ok) {
      setLead({ ...lead, work_status: to });
      setTimeline((t) => [
        { id: `local-${Date.now()}`, action: "status_changed", details: { from, to }, created_at: new Date().toISOString() },
        ...t,
      ]);
    } else setActionError(res.error);
  }

  async function save() {
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
    if (!reassignTo) return;
    setReassignBusy(true);
    setActionError(null);
    const res = await reassignLead(lead.id, reassignTo);
    setReassignBusy(false);
    if (res.ok) {
      setLead({ ...lead, franchise_id: res.franchiseId, franchise_name: res.franchiseName, franchise_code: res.franchiseCode });
      setReassignTo("");
      setTimeline((t) => [
        { id: `local-${Date.now()}`, action: "lead_reassigned", details: { to_franchise: res.franchiseCode }, created_at: new Date().toISOString() },
        ...t,
      ]);
    } else setActionError(res.error);
  }

  const selectCls =
    "h-10 w-full rounded-xl border border-border/50 bg-muted/30 px-3 text-sm text-foreground outline-none transition-colors focus:border-brand-navy/20 focus:bg-white";

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-7 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={basePath}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-white text-muted-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors hover:border-border hover:text-foreground"
            aria-label="Back to leads"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="font-heading text-xl font-bold tracking-tight text-brand-navy">{lead.full_name}</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground/70">Lead details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`tel:${lead.phone}`}
            className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-white px-3.5 py-2 text-[13px] font-semibold text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors hover:border-border"
          >
            <Phone className="h-4 w-4" /> Call
          </a>
          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-white px-3.5 py-2 text-[13px] font-semibold text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors hover:border-border"
            >
              <Mail className="h-4 w-4" /> Email
            </a>
          )}
        </div>
      </div>

      {actionError && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/[0.06] px-3.5 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {actionError}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* ── Main column ── */}
        <div className="space-y-5 lg:col-span-2">
          {/* Overview */}
          <Card>
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-navy/10 to-brand-navy/[0.03] text-lg font-bold text-brand-navy ring-1 ring-brand-navy/[0.06]">
                {lead.full_name?.charAt(0)?.toUpperCase() ?? "L"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-heading text-lg font-bold text-foreground">{lead.full_name}</h3>
                  <LeadStatusBadge status={lead.work_status} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <LeadSourceBadge source={lead.source} />
                  <span className="inline-flex items-center gap-1 rounded-md bg-brand-navy/[0.07] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-navy">
                    <Building2 className="h-3 w-3" /> {lead.franchise_code ?? "Unassigned"}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-2 text-foreground hover:text-brand-navy">
                    <Phone className="h-4 w-4 text-muted-foreground/60" /> {lead.phone}
                  </a>
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-2 text-foreground hover:text-brand-navy">
                      <Mail className="h-4 w-4 text-muted-foreground/60" /> {lead.email}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Consultation / Message */}
          {lead.message && (
            <Card>
              <SectionTitle icon={isConsultation ? CalendarClock : MessageSquare}>
                {isConsultation ? "Consultation" : "Message"}
              </SectionTitle>
              <div className="mt-3 space-y-1.5 rounded-xl bg-muted/30 p-4">
                {lead.message.split("\n").filter(Boolean).map((line, i) => {
                  const m = line.match(/^([^:—]+)[:—]\s*(.+)$/);
                  return m ? (
                    <p key={i} className="text-[13px] text-foreground">
                      <span className="font-semibold text-muted-foreground">{m[1].trim()}:</span> {m[2].trim()}
                    </p>
                  ) : (
                    <p key={i} className="text-[13px] font-medium text-foreground">{line}</p>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <SectionTitle icon={StickyNote}>Internal Notes</SectionTitle>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Add internal notes about this lead…"
              className="mt-3 w-full resize-y rounded-xl border border-border/50 bg-muted/30 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-brand-navy/20 focus:bg-white"
            />
            <div className="mt-2.5 flex items-center gap-2.5">
              <Button onClick={save} disabled={notesState === "saving"} variant="outline" size="sm">
                {notesState === "saving" && <Loader2 className="h-4 w-4 animate-spin" />} Save notes
              </Button>
              {notesState === "saved" && (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                </span>
              )}
            </div>
          </Card>

          {/* Activity timeline */}
          <Card>
            <SectionTitle icon={Clock}>Activity</SectionTitle>
            {timeline.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground/60">No activity yet.</p>
            ) : (
              <ol className="mt-4 space-y-4 border-l border-border/40 pl-5">
                {timeline.map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full bg-brand-navy/30 ring-4 ring-white" />
                    <p className="text-[13px] font-medium text-foreground">{describe(a)}</p>
                    <p className="text-[11px] text-muted-foreground/60">{fmtDateTime(a.created_at)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-5">
          {/* Lead details */}
          <Card>
            <SectionTitle icon={Tag}>Lead Details</SectionTitle>
            <dl className="mt-3 divide-y divide-border/30">
              <DetailRow icon={Phone} label="Phone">{lead.phone}</DetailRow>
              <DetailRow icon={Mail} label="Email">{lead.email ?? "—"}</DetailRow>
              <DetailRow icon={Tag} label="Source">{lead.source ? lead.source.replace(/_/g, " ") : "—"}</DetailRow>
              <DetailRow icon={MapPin} label="Pincode">
                {lead.pincode ? <span className="font-mono">{lead.pincode}</span> : "—"}
              </DetailRow>
              {lead.service_interested && (
                <DetailRow icon={MessageSquare} label="Service">{lead.service_interested}</DetailRow>
              )}
              <DetailRow icon={Clock} label="Created">{fmtDateTime(lead.created_at)}</DetailRow>
              {lead.assigned_at && (
                <DetailRow icon={CalendarClock} label="Assigned">{fmtDateTime(lead.assigned_at)}</DetailRow>
              )}
            </dl>
          </Card>

          {/* Routing */}
          <Card>
            <SectionTitle icon={Route}>Routing</SectionTitle>
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-muted/30 p-3.5">
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                  lead.franchise_code === "HQ"
                    ? "bg-brand-gold/15 text-brand-navy"
                    : "bg-brand-navy/10 text-brand-navy",
                )}
              >
                <Building2 className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-foreground">
                  {lead.franchise_name ?? lead.franchise_code ?? "Unassigned"}
                </p>
                <span
                  className={cn(
                    "mt-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                    route.tone === "emerald" && "bg-emerald-50 text-emerald-700",
                    route.tone === "amber" && "bg-amber-50 text-amber-700",
                    route.tone === "navy" && "bg-brand-navy/[0.07] text-brand-navy",
                    route.tone === "slate" && "bg-slate-100 text-slate-600",
                  )}
                >
                  {route.label}
                </span>
              </div>
            </div>
          </Card>

          {/* Manage */}
          <Card>
            <SectionTitle icon={CheckCircle2}>Manage</SectionTitle>
            <div className="mt-3 space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">Status</label>
                <select
                  value={lead.work_status}
                  disabled={statusBusy}
                  onChange={(e) => changeStatus(e.target.value as LeadStatus)}
                  className={selectCls}
                >
                  {LEAD_STATUSES.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>

              {canReassign && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">Reassign franchise</label>
                  <div className="flex gap-2">
                    <select value={reassignTo} onChange={(e) => setReassignTo(e.target.value)} className={selectCls}>
                      <option value="">Choose franchise…</option>
                      {franchises
                        .filter((f) => f.id !== lead.franchise_id)
                        .map((f) => (
                          <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
                        ))}
                    </select>
                    <Button
                      onClick={doReassign}
                      disabled={!reassignTo || reassignBusy}
                      className="shrink-0 bg-brand-navy hover:bg-brand-navy/90"
                    >
                      {reassignBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Duplicates */}
          {duplicates.length > 0 && (
            <Card className="border-amber-200/70 bg-amber-50/40">
              <SectionTitle icon={Copy}>
                Possible duplicate{duplicates.length > 1 ? "s" : ""}
              </SectionTitle>
              <p className="mt-1 text-[12px] text-amber-700/80">
                This number has {duplicates.length} other {duplicates.length === 1 ? "enquiry" : "enquiries"}.
              </p>
              <ul className="mt-2.5 space-y-1.5">
                {duplicates.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`${basePath}/${d.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white/70 px-3 py-2 text-[13px] text-amber-900 ring-1 ring-amber-200/60 transition-colors hover:bg-white"
                    >
                      <span className="truncate font-medium">{d.full_name}</span>
                      <span className="shrink-0 text-[11px] text-amber-700/70">
                        {d.work_status.replace(/_/g, " ")}
                        {d.franchise_code ? ` · ${d.franchise_code}` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Small building blocks ── */
function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/40 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 font-heading text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
      <Icon className="h-3.5 w-3.5" /> {children}
    </p>
  );
}

function DetailRow({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="flex items-center gap-2 text-[13px] text-muted-foreground/70">
        <Icon className="h-3.5 w-3.5 text-muted-foreground/40" /> {label}
      </span>
      <span className="min-w-0 truncate text-right text-[13px] font-medium capitalize text-foreground">{children}</span>
    </div>
  );
}
