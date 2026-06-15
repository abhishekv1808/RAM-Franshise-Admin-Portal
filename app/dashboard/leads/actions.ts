"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  LEAD_STATUS_KEYS,
  type LeadStatus,
  type UpdateLeadStatusResult,
  type LeadDetailResult,
  type SaveNotesResult,
  type ReassignResult,
} from "./schema";

/**
 * Move a lead to a new work_status and write a 'status_changed' audit entry.
 * Works for BOTH roles:
 *   - super_admin: any lead.
 *   - franchise_admin: only leads in their own franchise (verified, not assumed).
 */
export async function updateLeadStatus(
  leadId: string,
  from: string,
  to: LeadStatus
): Promise<UpdateLeadStatusResult> {
  if (!LEAD_STATUS_KEYS.includes(to)) return { ok: false, error: "Invalid status." };

  const ssr = await createClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };

  const { data: me } = await ssr
    .from("profiles")
    .select("role, franchise_id")
    .eq("id", user.id)
    .single();
  const role = me?.role as string | undefined;
  if (role !== "super_admin" && role !== "franchise_admin") {
    return { ok: false, error: "You are not allowed to update leads." };
  }

  const admin = createAdminClient();

  // A franchise admin can only move leads that belong to their franchise.
  if (role === "franchise_admin") {
    const { data: lead } = await admin
      .from("leads")
      .select("franchise_id")
      .eq("id", leadId)
      .maybeSingle();
    if (!lead || lead.franchise_id !== me?.franchise_id) {
      return { ok: false, error: "You can only update leads in your own franchise." };
    }
  }

  const { error } = await admin.rpc("set_lead_work_status", {
    p_actor_id: user.id,
    p_lead: leadId,
    p_from: from,
    p_to: to,
  });
  if (error) {
    const msg = error.message.includes("NOT_FOUND")
      ? "That lead no longer exists."
      : error.message.includes("BAD_STATUS")
        ? "Invalid status."
        : error.message;
    return { ok: false, error: msg };
  }

  revalidatePath("/dashboard/leads");
  revalidatePath("/franchise/leads");
  return { ok: true, status: to };
}

// Identify the caller's role + franchise (via their own session, RLS-safe).
async function actorRole() {
  const ssr = await createClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  if (!user) return { ssr, user: null, role: null, franchiseId: null };
  const { data: me } = await ssr
    .from("profiles")
    .select("role, franchise_id")
    .eq("id", user.id)
    .single();
  return {
    ssr,
    user,
    role: (me?.role as string | undefined) ?? null,
    franchiseId: (me?.franchise_id as string | undefined) ?? null,
  };
}

// Full lead detail + activity timeline. Read through the user's session so RLS
// scopes it: a franchise admin can only open their own franchise's leads.
export async function getLeadDetail(leadId: string): Promise<LeadDetailResult> {
  const ssr = await createClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };

  const { data: l } = await ssr
    .from("leads")
    .select(
      "id, full_name, phone, email, service_interested, message, source, work_status, created_at, assigned_at, notes, pincode, franchise_id, franchises(name, code)"
    )
    .eq("id", leadId)
    .maybeSingle();
  if (!l) return { ok: false, error: "Lead not found or not accessible." };

  const fr = l.franchises as unknown as { name: string; code: string } | null;
  const { data: logs } = await ssr
    .from("activity_logs")
    .select("id, action, details, created_at")
    .eq("entity_id", leadId)
    .eq("entity_type", "lead")
    .order("created_at", { ascending: false });

  // DUPLICATE DETECTION — other leads with the same phone.
  // Deliberately uses the SESSION client (ssr), NOT the service-role client, so
  // RLS scopes it: a franchise admin only ever sees matches within their OWN
  // franchise and can never learn a number also exists in another franchise.
  let duplicates: {
    id: string;
    full_name: string;
    work_status: string;
    franchise_code: string | null;
    created_at: string;
  }[] = [];
  if (l.phone) {
    const { data: dupRaw } = await ssr
      .from("leads")
      .select("id, full_name, work_status, created_at, franchises(code)")
      .eq("phone", l.phone)
      .neq("id", leadId)
      .order("created_at", { ascending: false });
    duplicates = (dupRaw ?? []).map((d) => ({
      id: d.id,
      full_name: d.full_name,
      work_status: d.work_status,
      created_at: d.created_at,
      franchise_code: (d.franchises as unknown as { code: string } | null)?.code ?? null,
    }));
  }

  return {
    ok: true,
    duplicates,
    lead: {
      id: l.id,
      full_name: l.full_name,
      phone: l.phone,
      email: l.email,
      service_interested: l.service_interested,
      message: l.message,
      source: l.source,
      work_status: l.work_status,
      created_at: l.created_at,
      assigned_at: l.assigned_at,
      notes: l.notes,
      pincode: l.pincode,
      franchise_id: l.franchise_id,
      franchise_name: fr?.name ?? null,
      franchise_code: fr?.code ?? null,
    },
    timeline: logs ?? [],
  };
}

// Save notes. super_admin: any lead. franchise_admin: their own lead only.
export async function saveLeadNotes(leadId: string, notes: string): Promise<SaveNotesResult> {
  const { user, role, franchiseId } = await actorRole();
  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };
  if (role !== "super_admin" && role !== "franchise_admin") {
    return { ok: false, error: "You are not allowed to edit this lead." };
  }

  const admin = createAdminClient();
  if (role === "franchise_admin") {
    const { data: lead } = await admin
      .from("leads")
      .select("franchise_id")
      .eq("id", leadId)
      .maybeSingle();
    if (!lead || lead.franchise_id !== franchiseId) {
      return { ok: false, error: "You can only edit leads in your own franchise." };
    }
  }

  const { error } = await admin.from("leads").update({ notes }).eq("id", leadId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/leads");
  revalidatePath("/franchise/leads");
  return { ok: true };
}

// Reassign a lead to a different franchise. SUPER ADMIN ONLY — a franchise
// admin is rejected here (and the UI never shows the control, and the RPC is
// service-role-only). Writes a 'lead_reassigned' audit entry.
export async function reassignLead(
  leadId: string,
  newFranchiseId: string
): Promise<ReassignResult> {
  const { user, role } = await actorRole();
  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };
  if (role !== "super_admin") {
    return { ok: false, error: "Only a super admin can reassign leads." };
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("reassign_lead", {
    p_actor_id: user.id,
    p_lead: leadId,
    p_new_franchise: newFranchiseId,
  });
  if (error) {
    return {
      ok: false,
      error: error.message.includes("NOT_FOUND")
        ? "That lead or franchise no longer exists."
        : error.message,
    };
  }

  const { data: fr } = await admin
    .from("franchises")
    .select("name, code")
    .eq("id", newFranchiseId)
    .single();

  revalidatePath("/dashboard/leads");
  revalidatePath("/franchise/leads");
  return {
    ok: true,
    franchiseId: newFranchiseId,
    franchiseCode: fr?.code ?? "",
    franchiseName: fr?.name ?? "",
  };
}
