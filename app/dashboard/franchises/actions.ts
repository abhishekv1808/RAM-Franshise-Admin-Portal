"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createFranchiseSchema,
  updateFranchiseSchema,
  setAdminPasswordSchema,
  type CreateFranchiseInput,
  type CreateFranchiseResult,
  type UpdateFranchiseInput,
  type UpdateFranchiseResult,
  type SetAdminPasswordResult,
  type FranchiseStatus,
  type SetStatusResult,
} from "./schema";

export async function createFranchise(
  input: CreateFranchiseInput
): Promise<CreateFranchiseResult> {
  // 0. Re-validate on the server (never trust the client).
  const parsed = createFranchiseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  const code = data.code.toUpperCase();

  // Identify the acting super_admin from the session (for the audit log).
  const ssr = await createClient();
  const {
    data: { user: actor },
  } = await ssr.auth.getUser();
  if (!actor) return { ok: false, error: "Your session expired. Please sign in again." };

  const admin = createAdminClient();

  // 1. DUPLICATE EMAIL (concern #2): reject before creating anything.
  const { data: emailTaken, error: emailErr } = await admin.rpc("auth_user_exists", {
    p_email: data.adminEmail,
  });
  if (emailErr) {
    return { ok: false, error: `Couldn't verify the admin email: ${emailErr.message}` };
  }
  if (emailTaken) {
    return {
      ok: false,
      error: `A user with email ${data.adminEmail} already exists. Use a different email.`,
      field: "adminEmail",
    };
  }

  // 2. Create the Auth user FIRST so an orphan franchise is impossible.
  //    The super admin sets the password directly — the admin signs in with it
  //    (email + password), no email invite/verification step.
  const { data: createdUser, error: createErr } = await admin.auth.admin.createUser({
    email: data.adminEmail,
    email_confirm: true, // admin-provisioned; account is ready to use immediately
    password: data.adminPassword,
    user_metadata: { full_name: data.adminName },
  });
  if (createErr || !createdUser?.user) {
    const msg = createErr?.message ?? "Failed to create the franchise admin account.";
    const friendly = /already|exists|registered/i.test(msg)
      ? `A user with email ${data.adminEmail} already exists. Use a different email.`
      : msg;
    return { ok: false, error: friendly, field: "adminEmail" };
  }
  const adminUserId = createdUser.user.id;

  // 3. ATOMIC DB WRITES (concern #1 + #3): franchise + profile link + audit log in
  //    ONE transaction. Code/pincode re-validated inside, race-safe.
  const { data: franchiseId, error: rpcErr } = await admin.rpc(
    "create_franchise_with_admin",
    {
      p_actor_id: actor.id,
      p_admin_id: adminUserId,
      p_admin_name: data.adminName,
      p_admin_email: data.adminEmail,
      p_phone: data.contactPhone,
      p_name: data.name,
      p_code: code,
      p_city: data.city,
      p_pincodes: data.pincodes,
      p_commission: data.commission,
    }
  );

  if (rpcErr) {
    // COMPENSATION: RPC transaction rolled back (no franchise/profile/log).
    // Delete the auth user from step 2 so nothing is orphaned.
    const { error: cleanupErr } = await admin.auth.admin.deleteUser(adminUserId);
    if (cleanupErr) {
      console.error(
        "[createFranchise] CRITICAL: rollback failed to delete auth user",
        adminUserId,
        cleanupErr
      );
      return {
        ok: false,
        error:
          mapDbError(rpcErr.message) +
          " (A temporary admin account could not be cleaned up automatically — please contact support.)",
      };
    }
    return {
      ok: false,
      error: mapDbError(rpcErr.message),
      field: dbErrorField(rpcErr.message),
    };
  }

  revalidatePath("/dashboard/franchises");
  return { ok: true, franchiseId: franchiseId as string };
}

// Verify the caller is a logged-in super_admin. Returns the actor or an error.
async function requireSuperAdmin() {
  const ssr = await createClient();
  const {
    data: { user: actor },
  } = await ssr.auth.getUser();
  if (!actor) return { ssr, actor: null, error: "Your session expired. Please sign in again." };
  const { data: me } = await ssr.from("profiles").select("role").eq("id", actor.id).single();
  if (me?.role !== "super_admin") {
    return { ssr, actor: null, error: "Only a super admin can perform this action." };
  }
  return { ssr, actor, error: null as string | null };
}

export async function updateFranchise(
  input: UpdateFranchiseInput
): Promise<UpdateFranchiseResult> {
  const parsed = updateFranchiseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const { actor, error: authErr } = await requireSuperAdmin();
  if (!actor) return { ok: false, error: authErr ?? "Not authorized." };

  // Atomic update + overlap re-check + audit log (RPC, service-role only).
  const admin = createAdminClient();
  const { error: rpcErr } = await admin.rpc("update_franchise", {
    p_actor_id: actor.id,
    p_franchise: data.id,
    p_name: data.name,
    p_city: data.city,
    p_pincodes: data.pincodes,
    p_commission: data.commission,
    p_email: data.contactEmail ?? "",
    p_phone: data.contactPhone ?? "",
  });
  if (rpcErr) {
    return {
      ok: false,
      error: mapDbError(rpcErr.message),
      field:
        rpcErr.message.includes("PINCODE_OVERLAP:") || rpcErr.message.includes("PINCODE_CONFLICT:")
          ? "pincodes"
          : undefined,
    };
  }

  revalidatePath("/dashboard/franchises");
  revalidatePath(`/dashboard/franchises/${data.id}`);
  return { ok: true, franchiseId: data.id };
}

// Set/replace a franchise admin's password. SUPER ADMIN ONLY. The franchise
// admin then signs in with their email + this password (no email round-trip).
export async function setFranchiseAdminPassword(
  franchiseId: string,
  password: string
): Promise<SetAdminPasswordResult> {
  const parsed = setAdminPasswordSchema.safeParse({ franchiseId, password });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { actor, error: authErr } = await requireSuperAdmin();
  if (!actor) return { ok: false, error: authErr ?? "Not authorized." };

  const admin = createAdminClient();

  // The franchise admin's auth account — profile.id IS the auth user id.
  const { data: adminProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("franchise_id", franchiseId)
    .eq("role", "franchise_admin")
    .maybeSingle();

  const userId = adminProfile?.id as string | undefined;
  if (!userId) return { ok: false, error: "This franchise has no admin account." };

  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: parsed.data.password,
  });
  if (error) return { ok: false, error: error.message };

  // Best-effort audit — never block the password change on a logging hiccup.
  try {
    await admin.from("activity_logs").insert({
      franchise_id: franchiseId,
      actor_id: actor.id,
      action: "admin_password_reset",
      entity_type: "franchise",
      entity_id: franchiseId,
      details: {},
    });
  } catch {
    /* non-fatal */
  }

  revalidatePath(`/dashboard/franchises/${franchiseId}`);
  return { ok: true };
}

// Suspend or reactivate a franchise. Suspension is enforced in middleware;
// data is never deleted. HQ is protected by the RPC.
export async function setFranchiseStatus(
  franchiseId: string,
  status: FranchiseStatus
): Promise<SetStatusResult> {
  const { actor, error: authErr } = await requireSuperAdmin();
  if (!actor) return { ok: false, error: authErr ?? "Not authorized." };

  const admin = createAdminClient();
  const { error: rpcErr } = await admin.rpc("set_franchise_status", {
    p_actor_id: actor.id,
    p_franchise: franchiseId,
    p_status: status,
  });
  if (rpcErr) return { ok: false, error: mapDbError(rpcErr.message) };

  revalidatePath("/dashboard/franchises");
  revalidatePath(`/dashboard/franchises/${franchiseId}`);
  return { ok: true, status };
}

// Translate raised Postgres exceptions into clean, user-facing messages.
function mapDbError(message: string): string {
  if (message.includes("CODE_TAKEN:")) return message.split("CODE_TAKEN:")[1].trim();
  if (message.includes("PINCODE_OVERLAP:")) return message.split("PINCODE_OVERLAP:")[1].trim();
  // DB-level uniqueness guard (trg_unique_pincodes) — e.g. claiming a 560xxx code
  // that still belongs to Head Office. Surface the "remove it there first" hint.
  if (message.includes("PINCODE_CONFLICT:")) return message.split("PINCODE_CONFLICT:")[1].trim();
  if (message.includes("HQ_PROTECTED:")) {
    return "Head Office can't be suspended — it's the system's unassigned-lead pool.";
  }
  if (message.includes("BAD_STATUS:")) return "Invalid franchise status.";
  if (message.includes("NOT_FOUND:")) {
    return "That franchise no longer exists — it may have been removed.";
  }
  if (message.includes("PROFILE_MISSING:")) {
    return "The admin account couldn't be linked to the franchise. Nothing was saved — please try again.";
  }
  return `Couldn't save the franchise: ${message}`;
}

function dbErrorField(message: string): keyof CreateFranchiseInput | undefined {
  if (message.includes("CODE_TAKEN:")) return "code";
  if (message.includes("PINCODE_OVERLAP:") || message.includes("PINCODE_CONFLICT:")) return "pincodes";
  return undefined;
}
