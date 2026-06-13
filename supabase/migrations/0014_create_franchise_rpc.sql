-- Phase 2 / Step 2 — transactional core for creating a franchise + linking its admin.
--
-- ATOMICITY: franchise insert + admin-profile link + activity log all run in ONE
-- transaction (a plpgsql function body is a single transaction). If ANY of them
-- raises, the WHOLE thing rolls back — you can never get a franchise row without
-- its admin profile linked, or vice versa.
--
-- The only non-DB step (creating the Supabase Auth user) happens in the server
-- action BEFORE this RPC, so "franchise created but no admin" is structurally
-- impossible. If this RPC fails, the action deletes that auth user (compensation).
--
-- SECURITY DEFINER so it can write role/franchise_id (column-revoked from normal
-- users) and bypass RLS. Execute is granted to service_role ONLY — a logged-in
-- franchise_admin can never call it.

-- Helper: does an auth user already exist for this email? (concern #2)
create or replace function public.auth_user_exists(p_email text)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (select 1 from auth.users where lower(email) = lower(p_email));
$$;

create or replace function public.create_franchise_with_admin(
  p_actor_id    uuid,     -- the super_admin performing the action (for the audit log)
  p_admin_id    uuid,     -- the already-created franchise admin auth user
  p_admin_name  text,
  p_admin_email text,
  p_phone       text,
  p_name        text,
  p_code        text,
  p_city        text,
  p_pincodes    text[],
  p_commission  numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_franchise_id uuid;
  v_conflict     record;
begin
  p_code := upper(trim(p_code));

  -- (1) Unique code  ── concern: duplicate code
  if exists (select 1 from public.franchises where upper(code) = p_code) then
    raise exception 'CODE_TAKEN: Franchise code "%" is already in use.', p_code;
  end if;

  -- (2) Pincode overlap with an ACTIVE franchise ── concern #3
  --     Names the specific franchise + pincode that conflicts.
  select f.name, f.code, pc as pincode
    into v_conflict
  from public.franchises f, unnest(f.pincodes) pc
  where f.status = 'active' and pc = any (p_pincodes)
  limit 1;

  if found then
    raise exception 'PINCODE_OVERLAP: Pincode % already belongs to active franchise "%" (%).',
      v_conflict.pincode, v_conflict.name, v_conflict.code;
  end if;

  -- (3) Create the franchise
  insert into public.franchises
    (name, code, city, pincodes, commission_percent, contact_email, contact_phone, status)
  values
    (p_name, p_code, p_city, p_pincodes, p_commission, p_admin_email, p_phone, 'active')
  returning id into v_franchise_id;

  -- (4) Link the admin's profile (created by handle_new_user) to this franchise.
  update public.profiles
     set role         = 'franchise_admin',
         franchise_id = v_franchise_id,
         full_name    = coalesce(nullif(p_admin_name, ''), full_name),
         phone        = coalesce(nullif(p_phone, ''), phone)
   where id = p_admin_id;

  if not found then
    raise exception 'PROFILE_MISSING: Admin profile % was not found to link.', p_admin_id;
  end if;

  -- (5) Audit log (actor = the super_admin)
  insert into public.activity_logs
    (franchise_id, actor_id, action, entity_type, entity_id, details)
  values
    (v_franchise_id, p_actor_id, 'franchise_created', 'franchise', v_franchise_id,
     jsonb_build_object('name', p_name, 'code', p_code,
                        'admin_email', p_admin_email, 'admin_id', p_admin_id));

  return v_franchise_id;
end;
$$;

-- Lock execution to server-side service-role only (concern #4 defense in depth).
revoke all on function public.auth_user_exists(text) from public, anon, authenticated;
revoke all on function public.create_franchise_with_admin(uuid,uuid,text,text,text,text,text,text,text[],numeric) from public, anon, authenticated;
grant execute on function public.auth_user_exists(text) to service_role;
grant execute on function public.create_franchise_with_admin(uuid,uuid,text,text,text,text,text,text,text[],numeric) to service_role;
