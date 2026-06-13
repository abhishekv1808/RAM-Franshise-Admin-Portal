-- FIX — the column-level revoke in 0011 was ineffective because anon/authenticated
-- hold TABLE-LEVEL insert/update grants on profiles (a column revoke cannot
-- subtract from a table-wide grant). A client could therefore still set their own
-- role = 'super_admin'.
--
-- Correct approach: drop the table-wide write grants, then re-grant write access
-- on ONLY the user-editable columns. role/franchise_id are never granted, so they
-- cannot be changed by anon/authenticated. The signup trigger (SECURITY DEFINER)
-- and service-role admin actions are unaffected.

-- 1. Remove the table-wide write grants that defeat column protection.
revoke insert, update on public.profiles from anon, authenticated;

-- 2. Re-grant write access on safe columns to authenticated only.
grant insert (id, email, full_name, phone, avatar_url, city, area, service_interests)
  on public.profiles to authenticated;

grant update (email, full_name, phone, avatar_url, city, area, service_interests)
  on public.profiles to authenticated;

-- anon intentionally receives NO insert/update on profiles.
-- role, franchise_id, created_at, updated_at are intentionally NOT granted.
