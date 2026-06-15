-- Phase 2 / Step 3 — transactional update for an existing franchise.
--
-- Mirrors 0014's create RPC: the pincode-overlap rule is re-checked (active
-- franchises only, EXCLUDING this one) and the update + audit log run in ONE
-- transaction. code is intentionally NOT updatable (it appears in invoice
-- numbers). status is NOT touched here — Suspend/Reactivate is its own step.
--
-- SECURITY DEFINER + execute granted to service_role ONLY (same lockdown as 0014).

create or replace function public.update_franchise(
  p_actor_id   uuid,     -- the super_admin performing the edit (for the audit log)
  p_franchise  uuid,
  p_name       text,
  p_city       text,
  p_pincodes   text[],
  p_commission numeric,
  p_email      text,
  p_phone      text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conflict record;
  v_exists   boolean;
begin
  select exists(select 1 from public.franchises where id = p_franchise) into v_exists;
  if not v_exists then
    raise exception 'NOT_FOUND: Franchise % does not exist.', p_franchise;
  end if;

  -- Pincode overlap with an ACTIVE franchise OTHER than this one.
  select f.name, f.code, pc as pincode
    into v_conflict
  from public.franchises f, unnest(f.pincodes) pc
  where f.status = 'active'
    and f.id <> p_franchise
    and pc = any (p_pincodes)
  limit 1;

  if found then
    raise exception 'PINCODE_OVERLAP: Pincode % already belongs to active franchise "%" (%).',
      v_conflict.pincode, v_conflict.name, v_conflict.code;
  end if;

  update public.franchises
     set name               = p_name,
         city               = p_city,
         pincodes           = p_pincodes,
         commission_percent = p_commission,
         contact_email      = nullif(p_email, ''),
         contact_phone      = nullif(p_phone, '')
   where id = p_franchise;

  insert into public.activity_logs
    (franchise_id, actor_id, action, entity_type, entity_id, details)
  values
    (p_franchise, p_actor_id, 'franchise_updated', 'franchise', p_franchise,
     jsonb_build_object('name', p_name, 'city', p_city,
                        'pincodes', p_pincodes, 'commission', p_commission));

  return p_franchise;
end;
$$;

revoke all on function public.update_franchise(uuid,uuid,text,text,text[],numeric,text,text)
  from public, anon, authenticated;
grant execute on function public.update_franchise(uuid,uuid,text,text,text[],numeric,text,text)
  to service_role;
