// Shared lead kanban definitions (used by super-admin /dashboard/leads and,
// in Step 3, franchise /franchise/leads).

export const LEAD_STATUSES = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "documents_pending", label: "Documents Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "closed", label: "Closed" },
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number]["key"];

export const LEAD_STATUS_KEYS = LEAD_STATUSES.map((s) => s.key) as readonly LeadStatus[];

// Known sources for the filter. `source` is free-text in the DB (the public
// site writes varied values), so the badge falls back gracefully for others.
export const LEAD_SOURCES = ["website", "whatsapp", "google", "walk_in", "referral"] as const;

export type LeadCard = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  service_interested: string | null;
  source: string | null;
  pincode: string | null;
  work_status: string;
  created_at: string;
  franchise_id: string | null;
  franchise_name: string | null;
  franchise_code: string | null;
};

export type UpdateLeadStatusResult =
  | { ok: true; status: LeadStatus }
  | { ok: false; error: string };

export type LeadDetail = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  service_interested: string | null;
  message: string | null;
  source: string | null;
  work_status: string;
  created_at: string;
  assigned_at: string | null;
  notes: string | null;
  pincode: string | null;
  franchise_id: string | null;
  franchise_name: string | null;
  franchise_code: string | null;
};

export type LeadActivity = {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type LeadDuplicate = {
  id: string;
  full_name: string;
  work_status: string;
  franchise_code: string | null;
  created_at: string;
};

export type LeadDetailResult =
  | { ok: true; lead: LeadDetail; timeline: LeadActivity[]; duplicates: LeadDuplicate[] }
  | { ok: false; error: string };

export type SaveNotesResult = { ok: true } | { ok: false; error: string };

export type ReassignResult =
  | { ok: true; franchiseId: string; franchiseCode: string; franchiseName: string }
  | { ok: false; error: string };
