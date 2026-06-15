-- Phase 2 / Step 4 — Suspend / Reactivate a franchise.
--
-- Flips franchises.status between 'active' and 'suspended' and writes an audit
-- log, atomically. Suspension NEVER deletes data — leads/payments/profiles stay;
-- access is gated at the middleware layer by reading this status.
--
-- HQ (the unassigned-lead pool) is protected: it can never be suspended.
-- SECURITY DEFINER + execute granted to service_role ONLY (same lockdown as 0014/0015).

create or replace function public.set_franchise_status(
  p_actor_id  uuid,
  p_franchise uuid,
  p_status    text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if p_status not in ('active', 'suspended') then
    raise exception 'BAD_STATUS: "%" is not a valid status.', p_status;
  end if;

  select code into v_code from public.franchises where id = p_franchise;
  if not found then
    raise exception 'NOT_FOUND: Franchise % does not exist.', p_franchise;
  end if;
  if upper(v_code) = 'HQ' then
    raise exception 'HQ_PROTECTED: Head Office cannot be suspended.';
  end if;

  update public.franchises set status = p_status where id = p_franchise;

  insert into public.activity_logs
    (franchise_id, actor_id, action, entity_type, entity_id, details)
  values
    (p_franchise, p_actor_id,
     case when p_status = 'suspended' then 'franchise_suspended' else 'franchise_reactivated' end,
     'franchise', p_franchise,
     jsonb_build_object('status', p_status));

  return p_status;
end;
$$;

revoke all on function public.set_franchise_status(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.set_franchise_status(uuid,uuid,text) to service_role;
