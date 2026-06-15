-- Phase 3 / Step 4 — lead notes + reassignment.
--
-- 1. notes column (additive, nullable -> public forms unaffected).
-- 2. reassign_lead RPC: moves a lead to a different franchise and logs
--    'lead_reassigned' (from -> to). SECURITY DEFINER + service_role only;
--    the server action additionally restricts this to super_admin (a franchise
--    admin can never reach it — UI-hidden, action-gated, and RPC-revoked).

alter table public.leads add column if not exists notes text;

create or replace function public.reassign_lead(
  p_actor_id      uuid,
  p_lead          uuid,
  p_new_franchise uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old      uuid;
  v_old_code text;
  v_new_code text;
begin
  select franchise_id into v_old from public.leads where id = p_lead;
  if not found then
    raise exception 'NOT_FOUND: Lead % does not exist.', p_lead;
  end if;

  select code into v_new_code from public.franchises where id = p_new_franchise;
  if not found then
    raise exception 'NOT_FOUND: Target franchise % does not exist.', p_new_franchise;
  end if;

  select code into v_old_code from public.franchises where id = v_old;

  update public.leads
     set franchise_id = p_new_franchise,
         assigned_at  = now()
   where id = p_lead;

  insert into public.activity_logs
    (franchise_id, actor_id, action, entity_type, entity_id, details)
  values
    (p_new_franchise, p_actor_id, 'lead_reassigned', 'lead', p_lead,
     jsonb_build_object('from_franchise', v_old_code, 'to_franchise', v_new_code,
                        'from_id', v_old, 'to_id', p_new_franchise));

  return p_new_franchise;
end;
$$;

revoke all on function public.reassign_lead(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.reassign_lead(uuid,uuid,uuid) to service_role;
