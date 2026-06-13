-- Step 3 (pre-req) — Create client_documents before applying its RLS.
-- Foundation schema; extend when the documents feature is built.
-- franchise_id is included so RLS can scope rows per franchise.

create table if not exists public.client_documents (
  id           uuid primary key default gen_random_uuid(),
  franchise_id uuid references public.franchises(id),
  lead_id      uuid references public.leads(id),
  uploaded_by  uuid references public.profiles(id),
  doc_type     text,
  file_name    text,
  file_path    text,
  status       text not null default 'pending',
  notes        text,
  created_at   timestamptz not null default now()
);

comment on table public.client_documents is
  'Documents collected for clients/leads, scoped by franchise (RLS-protected).';
