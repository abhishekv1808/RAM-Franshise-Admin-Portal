-- Step 2D — Create the payments table.
-- New table only; touches no existing data. Idempotent.

create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  franchise_id        uuid references public.franchises(id),
  lead_id             uuid references public.leads(id),
  client_name         text,
  service_slug        text,
  amount              numeric not null default 0,
  payment_method      text,
  razorpay_order_id   text,
  razorpay_payment_id text,
  status              text not null default 'pending',
  verification_status text not null default 'verified',
  collected_by        uuid references public.profiles(id),
  notes               text,
  created_at          timestamptz not null default now()
);

comment on table public.payments is
  'Payments collected against leads/services, scoped by franchise.';
