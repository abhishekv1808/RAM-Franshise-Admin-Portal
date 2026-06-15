-- Phase 3 / Step 1 — WIRE routing into the live lead-write path.
--
-- ⚠️ NOT YET APPLIED — hold until the routing logic (0017) is verified.
--
-- A BEFORE INSERT trigger is the only way to auto-route leads created by the
-- SEPARATE public-website codebase (which inserts via the service-role/anon key)
-- WITHOUT modifying that codebase. It runs server-side, transparently.
--
-- Safety properties so it can NEVER break a public lead insert:
--   * Only routes when franchise_id is NULL (never overrides an explicit assign).
--   * SECURITY DEFINER -> can set franchise_id and write activity_logs even for
--     an anon public insert (column/RLS privileges of the inserter don't apply
--     to values a trigger sets, and definer rights cover the log insert).
--   * The audit-log insert is wrapped in a BEGIN/EXCEPTION block, so a logging
--     hiccup can never roll back (block) the actual lead.
--   * Routing always resolves (pincode match OR HQ fallback); if HQ were somehow
--     missing, franchise_id is simply left NULL rather than raising.

create or replace function public.handle_new_lead_routing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pin   text;
  v_route record;
begin
  -- Respect an explicit assignment (e.g. admin-created lead).
  if NEW.franchise_id is not null then
    return NEW;
  end if;

  v_pin := coalesce(nullif(NEW.pincode, ''),
                    substring(NEW.message from 'Pincode:\s*(\d{6})'));

  select * into v_route from public.compute_lead_route(v_pin);

  if v_route.franchise_id is not null then
    NEW.franchise_id := v_route.franchise_id;
    NEW.assigned_at  := now();
  end if;
  NEW.pincode := coalesce(nullif(NEW.pincode, ''), v_pin);

  -- Best-effort audit: never block a public lead on a logging failure.
  begin
    insert into public.activity_logs
      (franchise_id, actor_id, action, entity_type, entity_id, details)
    values
      (NEW.franchise_id, null, 'lead_routed', 'lead', NEW.id,
       jsonb_build_object('pincode', v_pin,
                          'franchise_code', v_route.franchise_code,
                          'reason', v_route.reason));
  exception when others then
    null;
  end;

  return NEW;
end;
$$;

drop trigger if exists trg_route_lead on public.leads;
create trigger trg_route_lead
  before insert on public.leads
  for each row execute function public.handle_new_lead_routing();
