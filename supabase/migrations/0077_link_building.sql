-- Link building tracker: the backlink half of the "Get Found" step.
-- One row per website the practice wants a link from (a chamber
-- directory, a professional association, a local nonprofit's resource
-- list...): where it stands, who's working on it, the next step, and the
-- page where the link went live. Suggested rows come from a reviewed list
-- in src/lib/linkBuilding.ts (suggestion_key stops the same suggestion
-- being added twice); practices add their own too.
--
-- `owner_party` says who's doing the work: the practice itself, or its
-- marketing team (the agency, on done-for-you plans). Same access model
-- as referral partners: owner/agency only.

create table link_opportunities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  category text not null default 'other' check (category in (
    'chamber', 'directory', 'association', 'community', 'media', 'education', 'event', 'other'
  )),
  website text,
  suggestion_key text unique,
  -- todo -> in_progress -> submitted -> live; skipped = decided against.
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'submitted', 'live', 'skipped')),
  owner_party text not null default 'practice' check (owner_party in ('practice', 'agency')),
  next_step_date date,
  cost_note text,
  live_url text,
  live_on date,
  notes text
);

alter table link_opportunities enable row level security;

create policy "admin can read link opportunities" on link_opportunities
  for select using (is_owner() or is_agency());
create policy "admin can insert link opportunities" on link_opportunities
  for insert with check (is_owner() or is_agency());
create policy "admin can update link opportunities" on link_opportunities
  for update using (is_owner() or is_agency()) with check (is_owner() or is_agency());
create policy "admin can delete link opportunities" on link_opportunities
  for delete using (is_owner() or is_agency());
