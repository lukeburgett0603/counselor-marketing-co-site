-- Admin CMS Phase 4: website content section (safe fields + suggest-an-edit).
-- See CLAUDE.md's "Admin CMS" section for the full content-permission-tier
-- reasoning — this migration is the server-side enforcement of it, not just
-- a UI convention.

-- Drives both which dashboard controls render (client-side) and the
-- pages_enforce_content_permission trigger below (server-side). Defaults to
-- the more restricted tier — a new client site should start locked down,
-- not accidentally wide open.
alter table business
  add column content_permission_level text not null default 'restricted'
    check (content_permission_level in ('restricted', 'full'));

-- Business info (phone, email, address, client_portal_url, ...) is safe on
-- every tier — editing it can't break SEO or page structure the way page
-- copy can, so any authenticated admin login may update it directly.
create policy "authenticated can update business" on business
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Authenticated users can update any non-Blog-Post page row (testimonials,
-- and — subject to the trigger below — tier-gated copy fields). Blog Post
-- rows already have their own full-access policy from
-- 0010_blog_post_crud.sql; excluding them here just avoids two overlapping
-- policies on the same rows.
create policy "authenticated can update non-blog pages" on pages
  for update
  using (auth.role() = 'authenticated' and page_type <> 'Blog Post')
  with check (auth.role() = 'authenticated' and page_type <> 'Blog Post');

-- Enforces the content-permission tiers server-side, not just by hiding
-- controls in the UI: h1/meta_description/focus_keyword are always
-- agency-managed, on every tier, since a bad edit there doesn't look wrong
-- to a non-technical client the way bad body copy would. hero_subhead/copy/
-- images are agency-managed unless business.content_permission_level =
-- 'full'. Blog Post rows are exempt entirely — they're new additive
-- content the client fully owns creating (admin/blog.astro), not part of
-- this tiered system for editing *existing* pages. A locked field should
-- get a row in content_suggestions instead of a direct edit.
create or replace function enforce_content_permission()
returns trigger as $$
declare
  tier text;
begin
  if new.page_type = 'Blog Post' then
    return new;
  end if;

  if new.h1 is distinct from old.h1
    or new.meta_description is distinct from old.meta_description
    or new.focus_keyword is distinct from old.focus_keyword
  then
    raise exception 'h1, meta_description, and focus_keyword are protected on every plan — submit a suggestion instead';
  end if;

  if new.hero_subhead is distinct from old.hero_subhead
    or new.copy is distinct from old.copy
    or new.images is distinct from old.images
  then
    select content_permission_level into tier from business limit 1;
    if tier is distinct from 'full' then
      raise exception 'this field is protected on your current plan — submit a suggestion instead';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger pages_enforce_content_permission
  before update on pages
  for each row execute function enforce_content_permission();

-- ---------------------------------------------------------------------------
-- content_suggestions: a client's proposed edit to a locked/tier-gated
-- field, submitted for the agency to review manually (no review UI yet —
-- see project memory; every client site gets the ability to *submit*, only
-- Counselor Marketing Co.'s own site will ever get a *review* UI, and even
-- that is backlogged).
-- ---------------------------------------------------------------------------
create table content_suggestions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references pages(id) on delete cascade,
  field_name text not null,
  current_value text,
  suggested_value text not null,
  status text not null default 'pending' check (status in ('pending', 'reviewed')),
  submitted_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table content_suggestions enable row level security;

create policy "authenticated can submit content suggestions" on content_suggestions
  for insert with check (auth.role() = 'authenticated');

create policy "authenticated can read own content suggestions" on content_suggestions
  for select using (auth.uid() = submitted_by);
