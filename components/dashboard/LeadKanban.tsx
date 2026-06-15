"use client";

import { useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Phone, Clock, Building2, AlertCircle, Inbox } from "lucide-react";

import {
  LEAD_STATUSES,
  LEAD_SOURCES,
  type LeadCard as LeadCardT,
  type LeadStatus,
} from "@/app/dashboard/leads/schema";
import { updateLeadStatus } from "@/app/dashboard/leads/actions";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LeadDrawer } from "@/components/dashboard/LeadDrawer";

type Franchise = { id: string; name: string; code: string };

function timeSince(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

const SOURCE_STYLES: Record<string, string> = {
  website: "bg-blue-50 text-blue-700",
  whatsapp: "bg-emerald-50 text-emerald-700",
  google: "bg-amber-50 text-amber-700",
  walk_in: "bg-purple-50 text-purple-700",
  referral: "bg-pink-50 text-pink-700",
};

function SourceBadge({ source }: { source: string | null }) {
  if (!source) return null;
  const key = source.toLowerCase().replace(/\s+/g, "_");
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent capitalize", SOURCE_STYLES[key] ?? "bg-muted text-muted-foreground")}
    >
      {source.replace(/_/g, " ")}
    </Badge>
  );
}

function CardView({ lead, dragging }: { lead: LeadCardT; dragging?: boolean }) {
  const isHQ = lead.franchise_code === "HQ";
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-3 shadow-sm",
        dragging && "rotate-2 shadow-lg ring-2 ring-brand-navy/20"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium leading-tight text-foreground">{lead.full_name}</p>
        <SourceBadge source={lead.source} />
      </div>
      {lead.service_interested && (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{lead.service_interested}</p>
      )}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Phone className="h-3 w-3" /> {lead.phone}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" /> {timeSince(lead.created_at)}
        </span>
      </div>
      <div className="mt-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            isHQ ? "bg-brand-gold/15 text-brand-navy" : "bg-brand-navy/10 text-brand-navy"
          )}
        >
          <Building2 className="h-3 w-3" />
          {lead.franchise_code ?? "Unassigned"}
        </span>
      </div>
    </div>
  );
}

function DraggableCard({ lead, onOpen }: { lead: LeadCardT; onOpen: (l: LeadCardT) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={cn("cursor-grab touch-none active:cursor-grabbing", isDragging && "opacity-40")}
      onClick={() => onOpen(lead)}
      {...listeners}
      {...attributes}
    >
      <CardView lead={lead} />
    </div>
  );
}

function Column({
  col,
  leads,
  onOpen,
}: {
  col: { key: LeadStatus; label: string };
  leads: LeadCardT[];
  onOpen: (l: LeadCardT) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-brand-navy">{col.label}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
          {leads.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[140px] flex-1 flex-col gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-2 transition-colors",
          isOver && "border-brand-gold/60 bg-brand-gold/5"
        )}
      >
        {leads.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 py-6 text-center text-xs text-muted-foreground/70">
            <Inbox className="h-5 w-5" />
            <span>Drop leads here</span>
          </div>
        ) : (
          leads.map((l) => <DraggableCard key={l.id} lead={l} onOpen={onOpen} />)
        )}
      </div>
    </div>
  );
}

export function LeadKanban({
  leads: initialLeads,
  franchises,
  showFranchiseFilter = true,
  canReassign = false,
}: {
  leads: LeadCardT[];
  franchises: Franchise[];
  showFranchiseFilter?: boolean;
  canReassign?: boolean;
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [franchiseFilter, setFranchiseFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const draggedRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Ignore the synthetic click that fires right after a drag ends.
  function openLead(l: LeadCardT) {
    if (draggedRef.current) return;
    setSelectedId(l.id);
  }

  function patchLead(id: string, patch: Partial<LeadCardT>) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  const filtered = useMemo(
    () =>
      leads.filter((l) => {
        if (franchiseFilter !== "all" && l.franchise_id !== franchiseFilter) return false;
        if (sourceFilter !== "all" && (l.source ?? "").toLowerCase().replace(/\s+/g, "_") !== sourceFilter)
          return false;
        return true;
      }),
    [leads, franchiseFilter, sourceFilter]
  );

  const byStatus = useMemo(() => {
    const m: Record<string, LeadCardT[]> = {};
    for (const s of LEAD_STATUSES) m[s.key] = [];
    for (const l of filtered) (m[l.work_status] ??= []).push(l);
    return m;
  }, [filtered]);

  const activeLead = leads.find((l) => l.id === activeId) ?? null;

  function onDragStart(e: DragStartEvent) {
    draggedRef.current = true;
    setActiveId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    setTimeout(() => {
      draggedRef.current = false;
    }, 0);
    const dest = e.over ? (String(e.over.id) as LeadStatus) : null;
    if (!dest) return;
    const leadId = String(e.active.id);
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.work_status === dest) return;

    const from = lead.work_status;
    setError(null);
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, work_status: dest } : l)));

    const res = await updateLeadStatus(leadId, from, dest);
    if (!res.ok) {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, work_status: from } : l)));
      setError(res.error);
    }
  }

  const selectCls =
    "h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {showFranchiseFilter && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Franchise
            <select
              value={franchiseFilter}
              onChange={(e) => setFranchiseFilter(e.target.value)}
              className={selectCls}
            >
              <option value="all">All</option>
              {franchises.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.code})
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Source
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className={selectCls}
          >
            <option value="all">All</option>
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "lead" : "leads"}
        </span>
      </div>

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error} — the card was moved back.</span>
        </div>
      )}

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {LEAD_STATUSES.map((col) => (
            <Column key={col.key} col={col} leads={byStatus[col.key] ?? []} onOpen={openLead} />
          ))}
        </div>
        <DragOverlay>{activeLead ? <CardView lead={activeLead} dragging /> : null}</DragOverlay>
      </DndContext>

      {selectedId && (
        <LeadDrawer
          leadId={selectedId}
          franchises={franchises}
          canReassign={canReassign}
          onClose={() => setSelectedId(null)}
          onUpdated={(patch) => patchLead(selectedId, patch)}
          onOpenLead={(id) => setSelectedId(id)}
        />
      )}
    </div>
  );
}
