-- Phase 4 / Bucket A — Migration 1: payments restructure + commission ledger.
-- (RPCs come in the next migration. No write paths exist after this until then —
-- RLS is locked to SELECT-only, so the table is immutable from the API.)
--
-- Money-integrity model:
--   * commission_percent is SNAPSHOT per payment; commission_amount is GENERATED.
--   * Only status='verified' rows count toward revenue/commission.
--   * Refunds are append-only 'reversal' rows (kind='reversal', reverses_id),
--     never mutations -> settled payments stay immutable; the signed-sum view
--     keeps owed = earned - settled correct, including clawbacks (negative owed).

-- ── payments: drop the redundant status column, add ledger fields ──
alter table public.payments drop column if exists verification_status;

alter table public.payments
  add column if not exists currency           text not null default 'INR',
  add column if not exists paid_at            date not null default (now()::date),
  add column if not exists commission_percent numeric not null default 0,
  add column if not exists settlement_id      uuid,
  add column if not exists gateway            text,
  add column if not exists kind               text not null default 'payment',
  add column if not exists reverses_id        uuid references public.payments(id);

-- generated commission (depends on amount + commission_percent above)
alter table public.payments
  add column if not exists commission_amount numeric
    generated always as (round(amount * commission_percent / 100, 2)) stored;

-- every payment is attributed to a franchise; amount must be a real positive value
alter table public.payments alter column franchise_id set not null;
alter table public.payments alter column amount drop default;

alter table public.payments
  add constraint payments_amount_positive   check (amount > 0),
  add constraint payments_status_check      check (status in ('pending','verified','cancelled')),
  add constraint payments_kind_check        check (kind in ('payment','reversal')),
  add constraint payments_commission_pct    check (commission_percent >= 0 and commission_percent <= 100),
  add constraint payments_method_check
    check (payment_method is null or payment_method in
           ('cash','bank_transfer','upi','cheque','card','razorpay'));

-- ── commission_settlements: the monthly bank-transfer payout record ──
create table if not exists public.commission_settlements (
  id            uuid primary key default gen_random_uuid(),
  franchise_id  uuid not null references public.franchises(id),
  period_month  date,                         -- first of the covered month (informational)
  amount        numeric not null,             -- total paid; may be NEGATIVE (clawback)
  payment_count integer not null default 0,
  method        text not null default 'bank_transfer',
  reference     text,                          -- UTR / bank txn reference
  notes         text,
  settled_by    uuid references public.profiles(id),
  settled_at    timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

alter table public.payments
  add constraint payments_settlement_fk
  foreign key (settlement_id) references public.commission_settlements(id);

-- ── derived ledger: single source of truth (owed = earned - settled) ──
-- security_invoker so the caller's RLS scopes it (franchise admin -> own row only).
create or replace view public.franchise_commission_summary
with (security_invoker = true) as
select
  f.id   as franchise_id,
  f.name,
  f.code,
  coalesce(sum(amt.signed_amount)     filter (where p.status = 'verified'), 0) as gross_collected,
  coalesce(sum(amt.signed_commission) filter (where p.status = 'verified'), 0) as commission_earned,
  coalesce(sum(amt.signed_commission) filter (where p.status = 'verified' and p.settlement_id is not null), 0) as commission_settled,
  coalesce(sum(amt.signed_commission) filter (where p.status = 'verified'), 0)
    - coalesce(sum(amt.signed_commission) filter (where p.status = 'verified' and p.settlement_id is not null), 0) as commission_owed,
  count(*) filter (where p.status = 'pending') as pending_count
from public.franchises f
left join public.payments p on p.franchise_id = f.id
left join lateral (
  select
    case when p.kind = 'reversal' then -p.amount            else p.amount            end as signed_amount,
    case when p.kind = 'reversal' then -p.commission_amount else p.commission_amount end as signed_commission
) amt on true
group by f.id, f.name, f.code;

-- ── RLS: payments + settlements become SELECT-only; all writes via RPC later ──
drop policy if exists payments_franchise_admin_all on public.payments;
drop policy if exists payments_super_admin_all on public.payments;

create policy payments_super_admin_select on public.payments
  for select to authenticated
  using (public.get_user_role() = 'super_admin');
create policy payments_franchise_admin_select on public.payments
  for select to authenticated
  using (public.get_user_role() = 'franchise_admin' and franchise_id = public.get_user_franchise());

revoke insert, update, delete on public.payments from anon, authenticated;

alter table public.commission_settlements enable row level security;
create policy settlements_super_admin_select on public.commission_settlements
  for select to authenticated
  using (public.get_user_role() = 'super_admin');
create policy settlements_franchise_admin_select on public.commission_settlements
  for select to authenticated
  using (public.get_user_role() = 'franchise_admin' and franchise_id = public.get_user_franchise());

revoke insert, update, delete on public.commission_settlements from anon, authenticated;
grant select on public.commission_settlements to authenticated;
grant select on public.franchise_commission_summary to authenticated;
