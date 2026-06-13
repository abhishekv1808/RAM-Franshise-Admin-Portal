-- Lock down franchises (commission %, contact details).
-- Not used by the public site, so no anon access is granted.
--   * super_admin: full access.
--   * franchise_admin: read-only on their OWN franchise.

alter table public.franchises enable row level security;

create policy "franchises_super_admin_all" on public.franchises
  for all to authenticated
  using      (public.get_user_role() = 'super_admin')
  with check (public.get_user_role() = 'super_admin');

create policy "franchises_franchise_admin_select" on public.franchises
  for select to authenticated
  using (public.get_user_role() = 'franchise_admin'
         and id = public.get_user_franchise());
