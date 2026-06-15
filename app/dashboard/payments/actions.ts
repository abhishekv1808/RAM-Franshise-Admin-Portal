"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { recordPaymentSchema, type RecordPaymentInput, type RecordResult, type ActionResult } from "./schema";

async function actor() {
  const ssr = await createClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  if (!user) return { user: null, role: null, franchiseId: null };
  const { data: me } = await ssr.from("profiles").select("role, franchise_id").eq("id", user.id).single();
  return {
    user,
    role: (me?.role as string | undefined) ?? null,
    franchiseId: (me?.franchise_id as string | undefined) ?? null,
  };
}

function mapErr(message: string): string {
  if (message.includes("BAD_AMOUNT:")) return "Amount must be greater than zero.";
  if (message.includes("ALREADY_REVERSED:")) return "This payment has already been refunded.";
  if (message.includes("BAD_STATUS:")) return message.split("BAD_STATUS:")[1].trim();
  if (message.includes("BAD_TARGET:")) return message.split("BAD_TARGET:")[1].trim();
  if (message.includes("NOTHING_TO_SETTLE:")) return "No verified, unsettled commission for this franchise.";
  if (message.includes("NOT_FOUND:")) return "That record no longer exists.";
  return message;
}

function revalidate() {
  revalidatePath("/dashboard/payments");
  revalidatePath("/franchise/payments");
  revalidatePath("/dashboard");
  revalidatePath("/franchise");
}

// Record a PENDING payment. super_admin: any franchise. franchise_admin: own only.
export async function recordPayment(input: RecordPaymentInput): Promise<RecordResult> {
  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid input", field: issue?.path[0] as keyof RecordPaymentInput };
  }
  const data = parsed.data;

  const { user, role, franchiseId } = await actor();
  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };
  if (role !== "super_admin" && role !== "franchise_admin") {
    return { ok: false, error: "You are not allowed to record payments." };
  }
  const franchise = role === "franchise_admin" ? franchiseId : data.franchiseId;
  if (!franchise) return { ok: false, error: "No franchise to attribute this payment to." };

  const admin = createAdminClient();
  const { data: id, error } = await admin.rpc("record_payment", {
    p_actor_id: user.id,
    p_franchise: franchise,
    p_amount: data.amount,
    p_method: data.method,
    p_paid_at: data.paidAt,
    p_lead: null,
    p_client_name: data.clientName || null,
    p_service_slug: null,
    p_notes: data.notes || null,
  });
  if (error) return { ok: false, error: mapErr(error.message) };

  revalidate();
  return { ok: true, id: id as string };
}

// The verification + reversal + settlement actions are SUPER ADMIN ONLY.
async function superOnly() {
  const { user, role } = await actor();
  if (!user) return { user: null, error: "Your session expired. Please sign in again." };
  if (role !== "super_admin") return { user: null, error: "Only a super admin can do this." };
  return { user, error: null as string | null };
}

export async function verifyPayment(id: string): Promise<ActionResult> {
  const { user, error } = await superOnly();
  if (!user) return { ok: false, error: error! };
  const admin = createAdminClient();
  const { error: e } = await admin.rpc("verify_payment", { p_actor_id: user.id, p_payment: id });
  if (e) return { ok: false, error: mapErr(e.message) };
  revalidate();
  return { ok: true };
}

export async function cancelPayment(id: string): Promise<ActionResult> {
  const { user, error } = await superOnly();
  if (!user) return { ok: false, error: error! };
  const admin = createAdminClient();
  const { error: e } = await admin.rpc("cancel_payment", { p_actor_id: user.id, p_payment: id });
  if (e) return { ok: false, error: mapErr(e.message) };
  revalidate();
  return { ok: true };
}

export async function refundPayment(id: string, reason: string): Promise<ActionResult> {
  const { user, error } = await superOnly();
  if (!user) return { ok: false, error: error! };
  const admin = createAdminClient();
  const { error: e } = await admin.rpc("refund_payment", { p_actor_id: user.id, p_payment: id, p_reason: reason });
  if (e) return { ok: false, error: mapErr(e.message) };
  revalidate();
  return { ok: true };
}

export async function settleCommission(franchiseId: string, reference: string): Promise<ActionResult> {
  const { user, error } = await superOnly();
  if (!user) return { ok: false, error: error! };
  const admin = createAdminClient();
  const now = new Date();
  const period = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const { error: e } = await admin.rpc("settle_commission", {
    p_actor_id: user.id,
    p_franchise: franchiseId,
    p_period_month: period,
    p_reference: reference || null,
    p_notes: null,
  });
  if (e) return { ok: false, error: mapErr(e.message) };
  revalidate();
  return { ok: true };
}
