-- Step 2F — Backfill: Head Office franchise + assign existing data to it.
-- This is the only migration that writes to pre-existing rows, so it:
--   (1) takes an in-DB snapshot of leads FIRST, then
--   (2) creates the "Head Office" (HQ) franchise, then
--   (3) assigns all unassigned leads + the super_admin profile to HQ.

-- (1) SNAPSHOT — full copy of leads before any backfill write.
create table if not exists public.leads_backup_20260613 as
  select * from public.leads;

-- (2) HEAD OFFICE franchise (idempotent on the unique code 'HQ').
insert into public.franchises (name, code, city, status)
values ('Head Office', 'HQ', 'Bangalore', 'active')
on conflict (code) do nothing;

-- (3a) Assign every lead that has no franchise to Head Office.
update public.leads
set franchise_id = (select id from public.franchises where code = 'HQ')
where franchise_id is null;

-- (3b) Assign the existing super_admin profile to Head Office.
update public.profiles
set franchise_id = (select id from public.franchises where code = 'HQ')
where role = 'super_admin' and franchise_id is null;
