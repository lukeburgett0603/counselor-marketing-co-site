-- Counselor Marketing Co.-only: a private directory of every client
-- site's admin URL, for quick access when logging in as agency to
-- review suggestions or make edits. NOT part of the shared template —
-- this table and its admin page (admin/directory.astro) exist only in
-- this repo, since a generic client site has no other clients to list.
-- See CLAUDE.md's Admin CMS section for the reasoning.

create table client_sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  admin_url text not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table client_sites enable row level security;

create policy "agency can manage client sites" on client_sites
  for all using (is_agency()) with check (is_agency());
