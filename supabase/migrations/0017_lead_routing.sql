-- Phase 3 / Step 1 — Lead routing engine (logic only; NOT wired to the live
-- public lead-write path yet — that trigger is migration 0018, applied
-- separately after review).
--
-- The public website embeds the pincode inside the free-text `message` field
-- ("Location — Pincode: 560057, City: ..."). There is no structured pincode
-- column, so we add one (handy for the kanban filters) and extract from message.

-- 1. Structured pincode column + backfill from existing message text.
--    Additive + nullable -> the public forms (which never reference it) are
--    unaffected. Backfill does NOT touch franchise_id (existing assignments kept).
alter table public.leads add column if not exists pincode text;

update public.leads
   set pincode = substring(message from 'Pincode:\s*(\d{6})')
 where pincode is null
   and message ~ 'Pincode:\s*\d{6}';

-- 2. Pure routing decision: given a pincode, which franchise owns it?
--    pincode match on an ACTIVE franchise -> that franchise; otherwise HQ pool.
create or replace function public.compute_lead_route(p_pincode text)
returns table(franchise_id uuid, franchise_code text, reason text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_pincode is not null and p_pincode <> '' then
    return query
      select f.id, f.code, 'pincode_match'::text
      from public.franchises f
      where f.status = 'active' and p_pincode = any (f.pincodes)
      order by f.created_at
      limit 1;
    if found then return; end if;
  end if;

  -- Fallback: the Head Office unassigned-lead pool.
  return query
    select f.id, f.code,
           (case when p_pincode is null or p_pincode = ''
                 then 'no_pincode_hq_pool' else 'no_match_hq_pool' end)::text
    from public.franchises f
    where upper(f.code) = 'HQ'
    limit 1;
end;
$$;

-- 3. Apply routing to an ALREADY-INSERTED lead (used by the test harness, and
--    usable as a manual re-route). Sets franchise_id + assigned_at, fills the
--    pincode column if empty, and writes a 'lead_routed' audit entry.
create or replace function public.route_lead(p_lead_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pin   text;
  v_route record;
begin
  select coalesce(nullif(l.pincode, ''), substring(l.message from 'Pincode:\s*(\d{6})'))
    into v_pin
  from public.leads l
  where l.id = p_lead_id;

  if not found then
    raise exception 'NOT_FOUND: Lead % does not exist.', p_lead_id;
  end if;

  select * into v_route from public.compute_lead_route(v_pin);

  update public.leads
     set franchise_id = v_route.franchise_id,
         assigned_at  = now(),
         pincode      = coalesce(nullif(pincode, ''), v_pin)
   where id = p_lead_id;

  insert into public.activity_logs
    (franchise_id, actor_id, action, entity_type, entity_id, details)
  values
    (v_route.franchise_id, auth.uid(), 'lead_routed', 'lead', p_lead_id,
     jsonb_build_object('pincode', v_pin,
                        'franchise_code', v_route.franchise_code,
                        'reason', v_route.reason));

  return jsonb_build_object(
    'lead_id', p_lead_id,
    'pincode', v_pin,
    'franchise_id', v_route.franchise_id,
    'franchise_code', v_route.franchise_code,
    'reason', v_route.reason
  );
end;
$$;

-- Lock execution to service-role only (same model as the franchise RPCs).
revoke all on function public.compute_lead_route(text) from public, anon, authenticated;
revoke all on function public.route_lead(uuid) from public, anon, authenticated;
grant execute on function public.compute_lead_route(text) to service_role;
grant execute on function public.route_lead(uuid) to service_role;
