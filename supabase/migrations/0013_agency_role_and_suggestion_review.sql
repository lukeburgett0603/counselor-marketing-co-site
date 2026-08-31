-- Admin CMS Phase 6: a third admin role, 'agency' — the agency's own
-- super-admin access to every client site, distinct from that client's
-- own 'owner' — plus the suggestion review workflow it unlocks. See
-- CLAUDE.md's Admin CMS section for the full reasoning.

alter table admin_users drop constraint admin_users_role_check;
alter table admin_users add constraint admin_users_role_check check (role in ('owner', 'staff', 'agency'));

create or replace function is_agency()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from admin_users where id = auth.uid() and role = 'agency' and status = 'active'
  );
$$;

-- business: agency gets the same access as owner.
drop policy "owner can update business" on business;
create policy "admin can update business" on business
  for update using (is_owner() or is_agency()) with check (is_owner() or is_agency());

-- pages (non-blog): agency gets the same RLS access as owner — the
-- trigger below is what actually exempts agency from the
-- content-permission lock, not this policy.
drop policy "owner can update non-blog pages" on pages;
create policy "admin can update non-blog pages" on pages
  for update
  using (page_type <> 'Blog Post' and (is_owner() or is_agency()))
  with check (page_type <> 'Blog Post' and (is_owner() or is_agency()));

-- Blog CRUD: agency can touch any Blog Post row too, same as owner.
drop policy "admin can insert blog posts" on pages;
drop policy "admin can update own blog posts" on pages;
drop policy "admin can delete own blog posts" on pages;

create policy "admin can insert blog posts" on pages
  for insert
  with check (page_type = 'Blog Post' and (is_owner() or is_agency() or created_by = auth.uid()));

create policy "admin can update own blog posts" on pages
  for update
  using (page_type = 'Blog Post' and (is_owner() or is_agency() or created_by = auth.uid()))
  with check (page_type = 'Blog Post' and (is_owner() or is_agency() or created_by = auth.uid()));

create policy "admin can delete own blog posts" on pages
  for delete
  using (page_type = 'Blog Post' and (is_owner() or is_agency() or created_by = auth.uid()));

-- Agency is exempt from the content-permission lock entirely — they're
-- the ones enforcing it on everyone else, not subject to it. This is
-- what lets the Suggestions review screen apply an approved edit
-- directly instead of needing a manual SQL workaround.
create or replace function enforce_content_permission()
returns trigger as $$
declare
  tier text;
begin
  if new.page_type = 'Blog Post' then
    return new;
  end if;

  if is_agency() then
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

-- leads: agency gets the same support-visibility access as owner.
drop policy "owner can read leads" on leads;
drop policy "owner can update leads" on leads;
create policy "admin can read leads" on leads
  for select using (is_owner() or is_agency());
create policy "admin can update leads" on leads
  for update using (is_owner() or is_agency()) with check (is_owner() or is_agency());

-- admin_users: agency can see and manage the whole team. Owner can still
-- see everyone (so they know an agency support login exists) but can
-- never delete an agency row — that protection has to be a real RLS
-- rule, not just a hidden button, since the client could otherwise call
-- the API directly and revoke the agency's access to their own site.
drop policy "owner can read all admin_users rows" on admin_users;
create policy "admin can read all admin_users rows" on admin_users
  for select using (is_owner() or is_agency());

drop policy "owner can delete admin_users rows" on admin_users;
create policy "owner can delete non-agency admin_users rows" on admin_users
  for delete using (is_owner() and role <> 'agency');
create policy "agency can delete admin_users rows" on admin_users
  for delete using (is_agency());

-- content_suggestions: owner only ever sees their own submissions (the
-- "Your suggestions" status list on admin/content.astro); agency sees
-- and manages everything (the review screen). Replaces Phase 5's
-- owner-only, own-submission-only policies.
drop policy "owner can read own content suggestions" on content_suggestions;
create policy "owner can read own content suggestions" on content_suggestions
  for select using (is_owner() and auth.uid() = submitted_by);
create policy "agency can read all content suggestions" on content_suggestions
  for select using (is_agency());
create policy "agency can update content suggestions" on content_suggestions
  for update using (is_agency()) with check (is_agency());

-- Richer review state: pending -> approved | rejected, plus who reviewed
-- it, when, and why — reviewer_note is shown back to the client (most
-- important on a rejection, so they know why).
alter table content_suggestions drop constraint content_suggestions_status_check;
alter table content_suggestions add constraint content_suggestions_status_check
  check (status in ('pending', 'approved', 'rejected'));
alter table content_suggestions add column reviewer_note text;
alter table content_suggestions add column reviewed_by uuid references auth.users(id);
alter table content_suggestions add column reviewed_at timestamptz;
