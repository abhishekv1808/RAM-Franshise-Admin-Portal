-- Step 3 (fix) — Remove pre-existing permissive policies on leads that were
-- dormant while RLS was off and became active when RLS was enabled.
--
-- allow_auth_all   : FOR ALL to authenticated USING (true)  -> lets ANY logged-in
--                    user (incl. role 'client') read/edit/delete EVERY lead.
--                    This bypasses franchise isolation entirely. MUST be removed.
-- allow_anon_insert: redundant with leads_public_insert. Removed for a single,
--                    clearly-named source of truth.
--
-- Safe: the repointed old admin logs in as super_admin and is covered by
-- leads_super_admin_all; public capture is covered by leads_public_insert.

drop policy if exists "allow_auth_all" on public.leads;
drop policy if exists "allow_anon_insert" on public.leads;
