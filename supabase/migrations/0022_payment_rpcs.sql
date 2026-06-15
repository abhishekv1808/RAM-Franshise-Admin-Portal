-- Phase 4 / Bucket A — Migration 2: payment write RPCs.
-- All SECURITY DEFINER + service_role-only; the SERVER ACTION enforces role
-- (super_admin vs franchise-own), these trust the validated p_actor_id — same
-- pattern as the franchise/lead RPCs. Every mutation writes an activity_logs row.

-- 1. record_payment — insert a PENDING payment, snapshotting commission_percent.
create or replace function public.record_payment(
  p_actor_id     uuid,
  p_franchise    uuid,
  p_amount       numeric,
  p_method       text,
  p_paid_at      date,
  p_lead         uuid,
  p_client_name  text,
  p_service_slug text,
  p_notes        text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pct numeric;
  v_id  uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'BAD_AMOUNT: Amount must be greater than zero.';
  end if;

  select commission_percent into v_pct from public.franchises where id = p_franchise;
  if not found then
    raise exception 'NOT_FOUND: Franchise % does not exist.', p_franchise;
  end if;

  insert into public.payments
    (franchise_id, lead_id, client_name, service_slug, amount, payment_method,
     paid_at, status, kind, commission_percent, collected_by, notes)
  values
    (p_franchise, p_lead, p_client_name, p_service_slug, p_amount, p_method,
     coalesce(p_paid_at, now()::date), 'pending', 'payment', coalesce(v_pct, 0), p_actor_id, p_notes)
  returning id into v_id;

  insert into public.activity_logs (franchise_id, actor_id, action, entity_type, entity_id, details)
  values (p_franchise, p_actor_id, 'payment_recorded', 'payment', v_id,
          jsonb_build_object('amount', p_amount, 'method', p_method, 'commission_percent', v_pct));

  return v_id;
end;
$$;

-- 2. verify_payment — pending -> verified (the anti-fraud confirmation gate).
create or replace function public.verify_payment(p_actor_id uuid, p_payment uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fr uuid;
  v_status text;
begin
  select franchise_id, status into v_fr, v_status from public.payments where id = p_payment;
  if not found then raise exception 'NOT_FOUND: Payment % does not exist.', p_payment; end if;
  if v_status <> 'pending' then raise exception 'BAD_STATUS: Only a pending payment can be verified.'; end if;

  update public.payments set status = 'verified' where id = p_payment;

  insert into public.activity_logs (franchise_id, actor_id, action, entity_type, entity_id, details)
  values (v_fr, p_actor_id, 'payment_verified', 'payment', p_payment, jsonb_build_object('status', 'verified'));
end;
$$;

-- 3. cancel_payment — pending -> cancelled ONLY (verified/settled are immutable).
create or replace function public.cancel_payment(p_actor_id uuid, p_payment uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fr uuid;
  v_status text;
begin
  select franchise_id, status into v_fr, v_status from public.payments where id = p_payment;
  if not found then raise exception 'NOT_FOUND: Payment % does not exist.', p_payment; end if;
  if v_status <> 'pending' then
    raise exception 'BAD_STATUS: Only a pending payment can be cancelled. Verified payments must be refunded.';
  end if;

  update public.payments set status = 'cancelled' where id = p_payment;

  insert into public.activity_logs (franchise_id, actor_id, action, entity_type, entity_id, details)
  values (v_fr, p_actor_id, 'payment_cancelled', 'payment', p_payment, jsonb_build_object('status', 'cancelled'));
end;
$$;

-- 4. refund_payment — append a REVERSAL row; never mutate the original.
create or replace function public.refund_payment(p_actor_id uuid, p_payment uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.payments%rowtype;
  v_id uuid;
begin
  select * into o from public.payments where id = p_payment;
  if not found then raise exception 'NOT_FOUND: Payment % does not exist.', p_payment; end if;
  if o.kind <> 'payment' then raise exception 'BAD_TARGET: Only an original payment can be refunded.'; end if;
  if o.status <> 'verified' then raise exception 'BAD_STATUS: Only a verified payment can be refunded.'; end if;
  if exists (select 1 from public.payments where reverses_id = p_payment) then
    raise exception 'ALREADY_REVERSED: This payment has already been refunded.';
  end if;

  insert into public.payments
    (franchise_id, lead_id, client_name, service_slug, amount, payment_method,
     paid_at, status, kind, commission_percent, collected_by, notes, reverses_id)
  values
    (o.franchise_id, o.lead_id, o.client_name, o.service_slug, o.amount, o.payment_method,
     now()::date, 'verified', 'reversal', o.commission_percent, p_actor_id,
     coalesce(p_reason, 'Refund / reversal'), p_payment)
  returning id into v_id;

  insert into public.activity_logs (franchise_id, actor_id, action, entity_type, entity_id, details)
  values (o.franchise_id, p_actor_id, 'payment_refunded', 'payment', p_payment,
          jsonb_build_object('reversal_id', v_id, 'amount', o.amount, 'reason', p_reason));

  return v_id;
end;
$$;

-- 5. settle_commission — batch verified+unsettled commission (incl reversals)
--    into one settlement row and stamp those payments. Amount may be negative.
create or replace function public.settle_commission(
  p_actor_id    uuid,
  p_franchise   uuid,
  p_period_month date,
  p_reference   text,
  p_notes       text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount numeric;
  v_count  int;
  v_id     uuid;
begin
  select
    coalesce(sum(case when kind = 'reversal' then -commission_amount else commission_amount end), 0),
    count(*)
  into v_amount, v_count
  from public.payments
  where franchise_id = p_franchise and status = 'verified' and settlement_id is null;

  if v_count = 0 then
    raise exception 'NOTHING_TO_SETTLE: No verified, unsettled commission for this franchise.';
  end if;

  insert into public.commission_settlements
    (franchise_id, period_month, amount, payment_count, method, reference, notes, settled_by)
  values (p_franchise, p_period_month, v_amount, v_count, 'bank_transfer', p_reference, p_notes, p_actor_id)
  returning id into v_id;

  update public.payments
     set settlement_id = v_id
   where franchise_id = p_franchise and status = 'verified' and settlement_id is null;

  insert into public.activity_logs (franchise_id, actor_id, action, entity_type, entity_id, details)
  values (p_franchise, p_actor_id, 'commission_settled', 'settlement', v_id,
          jsonb_build_object('amount', v_amount, 'payment_count', v_count, 'reference', p_reference));

  return v_id;
end;
$$;

-- Lock all to service_role only.
revoke all on function public.record_payment(uuid,uuid,numeric,text,date,uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.verify_payment(uuid,uuid) from public, anon, authenticated;
revoke all on function public.cancel_payment(uuid,uuid) from public, anon, authenticated;
revoke all on function public.refund_payment(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.settle_commission(uuid,uuid,date,text,text) from public, anon, authenticated;
grant execute on function public.record_payment(uuid,uuid,numeric,text,date,uuid,text,text,text) to service_role;
grant execute on function public.verify_payment(uuid,uuid) to service_role;
grant execute on function public.cancel_payment(uuid,uuid) to service_role;
grant execute on function public.refund_payment(uuid,uuid,text) to service_role;
grant execute on function public.settle_commission(uuid,uuid,date,text,text) to service_role;
