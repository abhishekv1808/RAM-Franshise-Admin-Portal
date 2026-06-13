-- Step 2B — Extend profiles with franchise_id.
-- ADD COLUMN only; nothing dropped. (role was added in an earlier migration.)
-- Idempotent and non-destructive.

alter table public.profiles
  add column if not exists franchise_id uuid references public.franchises(id);

comment on column public.profiles.franchise_id is
  'The franchise this user belongs to. NULL for super_admin / unassigned.';
