-- Step 2C — Extend leads for franchise management.
-- Additive columns + reuse of the existing `source` column.

-- 1. New columns (ADD only; existing data untouched).
alter table public.leads
  add column if not exists franchise_id uuid references public.franchises(id),
  add column if not exists assigned_to  uuid references public.profiles(id),
  add column if not exists work_status  text not null default 'new',
  add column if not exists assigned_at  timestamptz;

-- 2. work_status guard. Safe: brand-new column, only the admin app writes it.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'leads_work_status_check') then
    alter table public.leads
      add constraint leads_work_status_check
      check (work_status in
        ('new','contacted','documents_pending','in_progress','completed','closed'));
  end if;
end $$;

-- 3. Reuse the existing `source` column. Give admin-created leads a default.
--    IMPORTANT: deliberately NO check constraint on source — the public website
--    writes free-text values ('Google','Social Media','Referral','Other'); a
--    strict enum check here would break public-site lead inserts.
alter table public.leads
  alter column source set default 'website';

-- 4. One-time normalization of existing values to the lowercase convention.
--    Currently the only existing value is 'Google' (3 rows) -> 'google'.
update public.leads set source = 'google' where source = 'Google';
