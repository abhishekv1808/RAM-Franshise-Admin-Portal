-- PII lockdown — enable RLS on profiles (names / phones / emails).
-- Design goals:
--   * Anon can read NOTHING (seals the public PII exposure).
--   * A user can read & edit ONLY their own profile.
--   * A user can NEVER change their own role/franchise (privilege escalation).
--   * super_admin can read all profiles; franchise_admin can read profiles in
--     their own franchise.
--   * The signup trigger (handle_new_user, SECURITY DEFINER) keeps working.
--   * Role assignment is done by the admin app via the service-role key.
--
-- NOTE: super_admin/franchise_admin checks use the SECURITY DEFINER helper
-- get_user_role(), which bypasses this very RLS — avoiding infinite recursion
-- that a direct subquery on profiles would cause.

alter table public.profiles enable row level security;

-- Self-service (own row only)
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Admin reads
create policy "profiles_super_admin_select" on public.profiles
  for select to authenticated
  using (public.get_user_role() = 'super_admin');

create policy "profiles_franchise_admin_select" on public.profiles
  for select to authenticated
  using (public.get_user_role() = 'franchise_admin'
         and franchise_id = public.get_user_franchise());

-- ESCALATION PREVENTION (column-level): strip insert/update on the privileged
-- columns from regular users. Even a crafted request cannot self-promote.
-- handle_new_user (SECURITY DEFINER) and service-role admin actions are
-- unaffected by these revokes.
revoke insert (role, franchise_id), update (role, franchise_id)
  on public.profiles from anon, authenticated;
