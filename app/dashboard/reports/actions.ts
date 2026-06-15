"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type SettleResult = { ok: true; settlementId: string } | { ok: false; error: string };

// Record a settlement for a franchise + period (settles the verified, unsettled
// payments with paid_at in [from, to]). Super admin only.
export async function recordSettlement(
  franchiseId: string,
  from: string,
  to: string,
  reference: string
): Promise<SettleResult> {
  const ssr = await createClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };
  const { data: me } = await ssr.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "super_admin") {
    return { ok: false, error: "Only a super admin can record settlements." };
  }

  const admin = createAdminClient();
  const { data: id, error } = await admin.rpc("settle_commission_period", {
    p_actor_id: user.id,
    p_franchise: franchiseId,
    p_from: from,
    p_to: to,
    p_reference: reference || null,
    p_notes: null,
  });
  if (error) {
    return {
      ok: false,
      error: error.message.includes("NOTHING_TO_SETTLE")
        ? "No unsettled commission for this franchise in the selected period."
        : error.message,
    };
  }

  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard");
  revalidatePath("/franchise");
  revalidatePath("/franchise/payments");
  return { ok: true, settlementId: id as string };
}
