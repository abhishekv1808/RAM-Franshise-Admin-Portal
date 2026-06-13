-- Step 2E — Create the activity_logs table (append-only audit trail).
-- New table only; touches no existing data. Idempotent.
-- NOTE: append-only is enforced at the policy layer in Step 3
--       (INSERT + SELECT policies only; no UPDATE/DELETE policy for any role).

create table if not exists public.activity_logs (
  id          uuid primary key default gen_random_uuid(),
  franchise_id uuid references public.franchises(id),
  actor_id    uuid references public.profiles(id),
  action      text not null,
  entity_type text,
  entity_id   uuid,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

comment on table public.activity_logs is
  'Append-only audit log. No UPDATE/DELETE policies are created (tamper-proof).';
