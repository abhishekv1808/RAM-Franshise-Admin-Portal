-- Step 3 — RLS helper functions.
-- SECURITY DEFINER so they can read profiles regardless of profiles' own RLS,
-- and a pinned search_path to prevent search-path hijacking.

create or replace function public.get_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.get_user_franchise()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select franchise_id from public.profiles where id = auth.uid();
$$;

revoke all on function public.get_user_role() from public;
revoke all on function public.get_user_franchise() from public;
grant execute on function public.get_user_role() to authenticated;
grant execute on function public.get_user_franchise() to authenticated;
