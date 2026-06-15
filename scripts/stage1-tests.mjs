// Stage 1 failure-case tests for createFranchise.
// Faithfully mirrors app/dashboard/franchises/actions.ts (email pre-check ->
// createUser -> create_franchise_with_admin RPC -> compensation on failure).
// The success-only invite email is intentionally never reached here.
//
// Run: node scripts/stage1-tests.mjs
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// --- load .env.local (no dotenv dependency) ---
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const log = (...a) => console.log(...a);
const hr = (t) => log("\n" + "=".repeat(72) + "\n" + t + "\n" + "=".repeat(72));

// ---- faithful mirror of the server action's create flow ----
async function createFranchiseFlow(actorId, input) {
  const code = input.code.toUpperCase();

  // 1. DUPLICATE EMAIL pre-check
  const { data: emailTaken, error: emailErr } = await admin.rpc("auth_user_exists", {
    p_email: input.adminEmail,
  });
  if (emailErr) return { ok: false, stage: "email-check", error: emailErr.message };
  if (emailTaken)
    return {
      ok: false,
      stage: "email-precheck",
      error: `A user with email ${input.adminEmail} already exists. Use a different email.`,
      field: "adminEmail",
    };

  // 2. Create the Auth user FIRST (so an orphan franchise is impossible)
  const { data: createdUser, error: createErr } = await admin.auth.admin.createUser({
    email: input.adminEmail,
    email_confirm: true,
    password: randomUUID() + randomUUID(),
    user_metadata: { full_name: input.adminName },
  });
  if (createErr || !createdUser?.user)
    return { ok: false, stage: "create-user", error: createErr?.message };
  const adminUserId = createdUser.user.id;
  log(`   • auth user created mid-flow: ${adminUserId}`);

  // 3. ATOMIC DB writes
  const { data: franchiseId, error: rpcErr } = await admin.rpc("create_franchise_with_admin", {
    p_actor_id: actorId,
    p_admin_id: adminUserId,
    p_admin_name: input.adminName,
    p_admin_email: input.adminEmail,
    p_phone: input.contactPhone,
    p_name: input.name,
    p_code: code,
    p_city: input.city,
    p_pincodes: input.pincodes,
    p_commission: input.commission,
  });

  if (rpcErr) {
    // COMPENSATION: delete the stray auth user from step 2.
    const { error: cleanupErr } = await admin.auth.admin.deleteUser(adminUserId);
    log(`   • RPC failed -> compensation deleteUser(${adminUserId}): ${cleanupErr ? "FAILED " + cleanupErr.message : "ok"}`);
    return {
      ok: false,
      stage: "rpc",
      error: rpcErr.message,
      compensatedUserId: adminUserId,
      compensationOk: !cleanupErr,
    };
  }
  return { ok: true, franchiseId, adminUserId };
}

// ---- helpers ----
const userExists = async (email) =>
  (await admin.rpc("auth_user_exists", { p_email: email })).data;
const franchiseByCode = async (code) =>
  (await admin.from("franchises").select("id,name,code,status,pincodes").eq("code", code)).data ?? [];
const allFranchises = async () =>
  (await admin.from("franchises").select("code,name,status,pincodes").order("created_at")).data ?? [];

async function main() {
  // actor for the audit log (only written on success; failing tests never reach it)
  const { data: sa } = await admin.from("profiles").select("id").eq("role", "super_admin").limit(1);
  const actorId = sa?.[0]?.id ?? randomUUID();
  log(`actor (super_admin) id: ${actorId}`);
  log("baseline franchises:", JSON.stringify(await allFranchises()));

  const results = {};

  // ===================== TEST #2 — DUPLICATE EMAIL =====================
  hr("TEST #2 — DUPLICATE EMAIL");
  const dupEmail = "stage1-dup@example.com";
  // setup: pre-create the user so the email is already taken
  const pre = await admin.auth.admin.createUser({ email: dupEmail, email_confirm: true, password: randomUUID() });
  const preId = pre.data?.user?.id;
  log(`setup: pre-created existing user ${dupEmail} -> ${preId}`);

  const r2 = await createFranchiseFlow(actorId, {
    name: "Dup Email Co", code: "DUP1", city: "Mysore", pincodes: ["560201"],
    commission: 10, adminEmail: dupEmail, adminName: "Dup Admin", contactPhone: "+919812345678",
  });
  log("RESULT:", JSON.stringify(r2, null, 2));
  const dup_franchise = await franchiseByCode("DUP1");
  log(`verify: franchise with code DUP1 created? ${dup_franchise.length} (expect 0)`);
  results["#2"] = {
    rejected: r2.ok === false && r2.stage === "email-precheck",
    noFranchise: dup_franchise.length === 0,
  };
  // cleanup: remove the pre-created user
  if (preId) await admin.auth.admin.deleteUser(preId);
  log(`cleanup: deleted pre-created user; still exists? ${await userExists(dupEmail)} (expect false)`);
  results["#2"].cleanedUp = (await userExists(dupEmail)) === false;

  // ===================== TEST #3 — PINCODE OVERLAP =====================
  hr("TEST #3 — PINCODE OVERLAP (active franchise)");
  const seedPin = "560777";
  // seed a throwaway ACTIVE franchise that owns the pincode
  const seed = await admin.from("franchises").insert({
    name: "Stage1 Overlap Seed", code: "SEEDO", city: "Mysore",
    pincodes: [seedPin], commission_percent: 5, status: "active",
  }).select("id,name,code,pincodes").single();
  log(`setup: seeded active franchise ${JSON.stringify(seed.data)}`);

  const overlapEmail = "stage1-overlap@example.com";
  const r3 = await createFranchiseFlow(actorId, {
    name: "Overlap Attempt", code: "OVLAP", city: "Mysore", pincodes: [seedPin],
    commission: 10, adminEmail: overlapEmail, adminName: "Overlap Admin", contactPhone: "+919812345679",
  });
  log("RESULT:", JSON.stringify(r3, null, 2));
  const ovl_franchise = await franchiseByCode("OVLAP");
  log(`verify: franchise OVLAP created? ${ovl_franchise.length} (expect 0 — rolled back)`);
  log(`verify: stray auth user ${overlapEmail} exists? ${await userExists(overlapEmail)} (expect false — compensated)`);
  results["#3"] = {
    rejected: r3.ok === false && /PINCODE_OVERLAP/.test(r3.error || ""),
    namesConflict: /SEEDO|Stage1 Overlap Seed/.test(r3.error || ""),
    noFranchise: ovl_franchise.length === 0,
    userCompensated: (await userExists(overlapEmail)) === false,
  };
  // cleanup: drop the seed franchise
  await admin.from("franchises").delete().eq("code", "SEEDO");
  log(`cleanup: deleted seed franchise SEEDO; still present? ${(await franchiseByCode("SEEDO")).length} (expect 0)`);
  results["#3"].cleanedUp = (await franchiseByCode("SEEDO")).length === 0;

  // ===================== TEST #4 — MID-CREATION FAILURE =====================
  hr("TEST #4 — MID-CREATION FAILURE (RPC raises after auth user created)");
  const fcountBefore = (await allFranchises()).length;
  const codeTakenEmail = "stage1-codetaken@example.com";
  // Use an existing code ("HQ") so the email pre-check PASSES, the auth user IS
  // created, and the RPC then raises CODE_TAKEN — exercising compensation.
  const r4 = await createFranchiseFlow(actorId, {
    name: "Mid Failure Co", code: "HQ", city: "Mysore", pincodes: ["560999"],
    commission: 10, adminEmail: codeTakenEmail, adminName: "Mid Admin", contactPhone: "+919812345680",
  });
  log("RESULT:", JSON.stringify(r4, null, 2));
  const fcountAfter = (await allFranchises()).length;
  const hqRows = await franchiseByCode("HQ");
  log(`verify: orphan franchise? franchise count ${fcountBefore} -> ${fcountAfter} (expect unchanged)`);
  log(`verify: code HQ row count = ${hqRows.length} (expect 1 — the original only)`);
  log(`verify: stray auth user ${codeTakenEmail} exists? ${await userExists(codeTakenEmail)} (expect false — compensated)`);
  results["#4"] = {
    rejected: r4.ok === false && /CODE_TAKEN/.test(r4.error || ""),
    compensationOk: r4.compensationOk === true,
    noOrphanFranchise: fcountAfter === fcountBefore && hqRows.length === 1,
    userCompensated: (await userExists(codeTakenEmail)) === false,
  };

  // ===================== FINAL STATE =====================
  hr("FINAL DB STATE (should equal baseline)");
  log("franchises:", JSON.stringify(await allFranchises(), null, 2));
  log("test users still present:",
    JSON.stringify({
      dup: await userExists(dupEmail),
      overlap: await userExists(overlapEmail),
      codeTaken: await userExists(codeTakenEmail),
    }));

  hr("SUMMARY");
  log(JSON.stringify(results, null, 2));
  const allPass = Object.values(results).every((r) => Object.values(r).every(Boolean));
  log("\nALL ASSERTIONS PASSED:", allPass);
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => { console.error("FATAL", e); process.exit(2); });
