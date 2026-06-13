-- Step 2A — Create the franchises table.
-- New table only; touches no existing data. Idempotent.

create table if not exists public.franchises (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  code               text not null unique,
  city               text,
  pincodes           text[] not null default '{}',
  contact_email      text,
  contact_phone      text,
  commission_percent numeric not null default 0,
  status             text not null default 'active',
  created_at         timestamptz not null default now()
);

comment on table public.franchises is
  'Franchise/branch tenants for the RAM Admin franchise management system.';
