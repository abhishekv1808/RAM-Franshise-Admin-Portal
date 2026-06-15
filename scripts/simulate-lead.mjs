// Simulate "a new public-website lead came in" and verify routing — WITHOUT
// touching the live public forms or the live trigger.
//
//   node scripts/simulate-lead.mjs               # runs default cases (TUM + HQ + no-pincode)
//   node scripts/simulate-lead.mjs 560023        # route a single pincode
//   node scripts/simulate-lead.mjs 560023 --keep # keep the test lead(s) instead of cleaning up
//
// Each case inserts a lead exactly like the public form (pincode embedded in
// `message`, franchise_id left NULL), then calls route_lead() and reports where
// it landed. Cleans up afterward unless --keep is passed.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const args = process.argv.slice(2);
const keep = args.includes("--keep");
const pincodeArgs = args.filter((a) => /^\d{6}$/.test(a));
const TAG = "SIM ROUTING TEST";

// Default: a Tumkur-territory pincode, an unmatched pincode, and no pincode.
const cases = pincodeArgs.length
  ? pincodeArgs.map((p) => ({ label: `pincode ${p}`, pincode: p }))
  : [
      { label: "Tumkur territory (560023)", pincode: "560023" },
      { label: "Unmatched (999999)", pincode: "999999" },
      { label: "No pincode in message", pincode: null },
    ];

const created = [];

async function simulate({ label, pincode }) {
  const message = pincode
    ? `Location — Pincode: ${pincode}, City: Testville, State: Karnataka\n\nSimulated enquiry.`
    : `No location provided.\n\nSimulated enquiry.`;

  // 1. Insert exactly like the public form: franchise_id NULL, pincode unknown.
  const { data: lead, error: insErr } = await admin
    .from("leads")
    .insert({
      full_name: `${TAG} (${label})`,
      phone: "9999900000",
      email: "sim@example.com",
      service_interested: "Routing Test",
      message,
      source: "website",
      work_status: "new",
    })
    .select("id, franchise_id")
    .single();
  if (insErr) throw new Error("insert failed: " + insErr.message);
  created.push(lead.id);

  // 2. Route it. If the live BEFORE INSERT trigger (0018) already assigned a
  //    franchise on insert, don't re-route (avoids a duplicate lead_routed log).
  //    If the trigger isn't installed, franchise_id is still NULL -> route now.
  let how = "live trigger on insert";
  if (!lead.franchise_id) {
    const { error: rErr } = await admin.rpc("route_lead", { p_lead_id: lead.id });
    if (rErr) throw new Error("route_lead failed: " + rErr.message);
    how = "route_lead() (trigger not installed)";
  }

  // 3. Read back the persisted state + the audit log.
  const { data: after } = await admin
    .from("leads")
    .select("franchise_id, pincode, assigned_at, franchises(name, code)")
    .eq("id", lead.id)
    .single();
  const { data: log } = await admin
    .from("activity_logs")
    .select("action, details")
    .eq("entity_id", lead.id)
    .eq("action", "lead_routed")
    .maybeSingle();

  const fr = after.franchises;
  console.log(`\n• ${label}`);
  console.log(`    inserted with franchise_id: ${lead.franchise_id ?? "null"}  | routed via: ${how}`);
  console.log(`    routed -> ${fr?.name} (${fr?.code})   reason: ${log?.details?.reason ?? "?"}`);
  console.log(`    lead.pincode now: ${after.pincode ?? "null"} | assigned_at: ${after.assigned_at ? "set" : "null"}`);
  console.log(`    activity_log: ${log ? `${log.action} ${JSON.stringify(log.details)}` : "(none)"}`);
}

console.log("=== LEAD ROUTING SIMULATION ===");
for (const c of cases) await simulate(c);

if (keep) {
  console.log(`\n(kept ${created.length} simulated lead(s) — re-run without --keep to clean up, or delete by full_name '${TAG}%')`);
} else {
  await admin.from("activity_logs").delete().in("entity_id", created);
  const { error } = await admin.from("leads").delete().in("id", created);
  console.log(`\ncleanup: removed ${created.length} simulated lead(s) + their logs ${error ? "(ERROR " + error.message + ")" : "✓"}`);
}

// Final state for sanity.
const { data: counts } = await admin
  .from("leads")
  .select("franchise_id, franchises(code)")
  .not("franchise_id", "is", null);
const byCode = {};
for (const r of counts ?? []) {
  const c = r.franchises?.code ?? "?";
  byCode[c] = (byCode[c] ?? 0) + 1;
}
console.log("current lead counts by franchise:", JSON.stringify(byCode));
