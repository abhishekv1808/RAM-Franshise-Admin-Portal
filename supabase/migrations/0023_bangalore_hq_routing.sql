-- Phase 3 — Bangalore (560xxx) routes to Head Office + pincode uniqueness guard.
--
-- Context: the lead-routing engine (0017/0018) matches a lead's pincode against
-- each active franchise's `pincodes[]`, else falls back to the HQ pool. Bangalore
-- is currently HQ-served, but relying on the bare fallback is implicit and the
-- `compute_lead_route` tiebreak is `order by created_at` — so a future franchise
-- could silently outrank HQ. This migration makes the HQ claim explicit and
-- adds a guard so it can never be silently overridden.

-- ── Part 1 — HQ explicitly claims the whole 560000–560999 block ──────────────
-- Idempotent + de-duplicated, so re-running is safe. Generated, not hand-typed.
update public.franchises
   set pincodes = array(
     select distinct unnest(
       coalesce(pincodes, '{}') ||
       (select array_agg('560' || lpad(g::text, 3, '0')) from generate_series(0, 999) g)
     )
   )
 where upper(code) = 'HQ';

-- ── Part 2 — Pincode uniqueness guard ───────────────────────────────────────
-- Prevents two franchises from ever claiming the same pincode. This makes the
-- Bangalore→HQ assignment tamper-evident: to give 560xxx to a real Bangalore
-- franchise later, you must first remove those codes from HQ (a deliberate act),
-- so no lead is ever silently misrouted.
create or replace function public.enforce_unique_pincodes()
returns trigger
language plpgsql
as $$
declare
  v_code text;
  v_pin  text;
begin
  if NEW.pincodes is null or array_length(NEW.pincodes, 1) is null then
    return NEW;
  end if;

  -- Any incoming pincode already owned by ANOTHER franchise?
  select f.code, p
    into v_code, v_pin
  from public.franchises f
       cross join lateral unnest(f.pincodes) as p
  where f.id <> NEW.id
    and p = any (NEW.pincodes)
  limit 1;

  if v_pin is not null then
    raise exception
      'PINCODE_CONFLICT: pincode % is already assigned to franchise % - remove it there first.',
      v_pin, v_code
      using errcode = '23505';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_unique_pincodes on public.franchises;
create trigger trg_unique_pincodes
  before insert or update of pincodes on public.franchises
  for each row execute function public.enforce_unique_pincodes();
