"use server";

import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createFranchiseSchema,
  type CreateFranchiseInput,
  type CreateFranchiseResult,
} from "./schema";

async function getOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3001";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

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
  const { data: createdUser, error: createErr } = await admin.auth.admin.createUser({
    email: data.adminEmail,
    email_confirm: true, // admin-provisioned; they set their own password via the invite link
    password: randomUUID() + randomUUID(), // placeholder, immediately replaced via invite
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

  // 4. Send the password-setup email (best-effort: a delivery failure does NOT
  //    roll back the franchise — the detail page offers "Resend invite").
  let inviteSent = true;
  let inviteWarning: string | undefined;
  const redirectTo = `${await getOrigin()}/auth/callback?next=/set-password`;
  const { error: inviteErr } = await ssr.auth.resetPasswordForEmail(data.adminEmail, {
    redirectTo,
  });
  if (inviteErr) {
    inviteSent = false;
    inviteWarning = inviteErr.message;
    console.error(
      "[createFranchise] invite email failed (franchise still created):",
      inviteErr
    );
  }

  revalidatePath("/dashboard/franchises");
  return { ok: true, franchiseId: franchiseId as string, inviteSent, inviteWarning };
}

// Translate raised Postgres exceptions into clean, user-facing messages.
function mapDbError(message: string): string {
  if (message.includes("CODE_TAKEN:")) return message.split("CODE_TAKEN:")[1].trim();
  if (message.includes("PINCODE_OVERLAP:")) return message.split("PINCODE_OVERLAP:")[1].trim();
  if (message.includes("PROFILE_MISSING:")) {
    return "The admin account couldn't be linked to the franchise. Nothing was saved — please try again.";
  }
  return `Couldn't create the franchise: ${message}`;
}

function dbErrorField(message: string): keyof CreateFranchiseInput | undefined {
  if (message.includes("CODE_TAKEN:")) return "code";
  if (message.includes("PINCODE_OVERLAP:")) return "pincodes";
  return undefined;
}
