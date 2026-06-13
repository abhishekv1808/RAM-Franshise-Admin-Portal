-- Step 3 — Enable RLS and add policies.
-- Tables: leads, payments, client_documents, activity_logs.
-- Roles:  super_admin (all), franchise_admin (own franchise only).
-- Public lead capture is preserved via an INSERT-ONLY policy on leads.

-- ───────────────────────── leads ─────────────────────────
alter table public.leads enable row level security;

-- super_admin: full access to every lead.
create policy "leads_super_admin_all" on public.leads
  for all to authenticated
  using      (public.get_user_role() = 'super_admin')
  with check (public.get_user_role() = 'super_admin');

-- franchise_admin: only leads belonging to their franchise.
create policy "leads_franchise_admin_all" on public.leads
  for all to authenticated
  using      (public.get_user_role() = 'franchise_admin'
              and franchise_id = public.get_user_franchise())
  with check (public.get_user_role() = 'franchise_admin'
              and franchise_id = public.get_user_franchise());

-- Public lead capture: INSERT ONLY. No SELECT/UPDATE/DELETE policy exists for
-- anon/authenticated non-admins, so they can CREATE a lead but NEVER read,
-- edit, or delete one. Covers logged-out (anon) AND logged-in client
-- submissions of the public website forms.
create policy "leads_public_insert" on public.leads
  for insert to anon, authenticated
  with check (true);

-- ──────────────────────── payments ───────────────────────
alter table public.payments enable row level security;

create policy "payments_super_admin_all" on public.payments
  for all to authenticated
  using      (public.get_user_role() = 'super_admin')
  with check (public.get_user_role() = 'super_admin');

create policy "payments_franchise_admin_all" on public.payments
  for all to authenticated
  using      (public.get_user_role() = 'franchise_admin'
              and franchise_id = public.get_user_franchise())
  with check (public.get_user_role() = 'franchise_admin'
              and franchise_id = public.get_user_franchise());

-- ───────────────────── client_documents ──────────────────
alter table public.client_documents enable row level security;

create policy "client_documents_super_admin_all" on public.client_documents
  for all to authenticated
  using      (public.get_user_role() = 'super_admin')
  with check (public.get_user_role() = 'super_admin');

create policy "client_documents_franchise_admin_all" on public.client_documents
  for all to authenticated
  using      (public.get_user_role() = 'franchise_admin'
              and franchise_id = public.get_user_franchise())
  with check (public.get_user_role() = 'franchise_admin'
              and franchise_id = public.get_user_franchise());

-- ───────────────────── activity_logs ─────────────────────
-- APPEND-ONLY: only INSERT and SELECT policies. No UPDATE or DELETE policy is
-- created for ANY role, so rows can never be modified or removed (tamper-proof).
alter table public.activity_logs enable row level security;

create policy "activity_logs_select" on public.activity_logs
  for select to authenticated
  using (
    public.get_user_role() = 'super_admin'
    or (public.get_user_role() = 'franchise_admin'
        and franchise_id = public.get_user_franchise())
  );

create policy "activity_logs_insert" on public.activity_logs
  for insert to authenticated
  with check (
    public.get_user_role() = 'super_admin'
    or (public.get_user_role() = 'franchise_admin'
        and franchise_id = public.get_user_franchise())
  );
