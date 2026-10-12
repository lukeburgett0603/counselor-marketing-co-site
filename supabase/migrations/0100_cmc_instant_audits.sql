-- Instant Caseload Audits (CMC only, never synced to the template).
-- Numbered 0100 so it can't collide with template migrations 0066+ when
-- this repo is next brought current (push those with --include-all).
--
-- One row per audit request. The prospect reads theirs through the
-- get-audit function by its random token; nothing here is readable with
-- the anon key. Owner/agency logins can read every row (for a future
-- admin list of audits).

create table public.audits (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  lead_id uuid references public.leads(id) on delete set null,
  name text,
  email text not null,
  practice_input text not null,
  practice_name text,
  url text,
  city text,
  state text,
  status text not null default 'pending'
    check (status in ('pending', 'needs_city', 'running', 'done', 'failed')),
  data jsonb,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  emailed_at timestamptz,
  first_viewed_at timestamptz,
  view_count integer not null default 0
);

create index audits_email_created_idx on public.audits (lower(email), created_at desc);
create index audits_created_idx on public.audits (created_at desc);

alter table public.audits enable row level security;

create policy "admins can read audits" on public.audits
  for select using (is_owner() or is_agency());
