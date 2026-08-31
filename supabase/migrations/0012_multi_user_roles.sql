-- Admin CMS Phase 5: multi-user roles. Two roles only for v1 — 'owner'
-- (everything) and 'staff' (blog posts only, own posts only; owner can
-- edit/delete anything). See CLAUDE.md's Admin CMS section for the full
-- reasoning.

create table admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner', 'staff')),
  status text not null default 'pending' check (status in ('pending', 'active')),
  created_at timestamptz not null default now()
);

alter table admin_users enable row level security;

-- SECURITY DEFINER so a policy that needs "is the caller an owner?" can
-- look this up without recursing through admin_users' own RLS (a plain
-- subquery in a USING clause would re-trigger RLS on the inner query
-- too) — the standard pattern for a self-referential role check.
create or replace function is_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from admin_users where id = auth.uid() and role = 'owner' and status = 'active'
  );
$$;

create policy "user can read own admin_users row" on admin_users
  for select using (auth.uid() = id);

create policy "owner can read all admin_users rows" on admin_users
  for select using (is_owner());

-- The only client-side write path onto admin_users: an invited user
-- flipping their own row from pending to active once they set a password.
-- Inserting a row (invite) and deleting one (revoke) both go through
-- service_role — see supabase/functions/publish-site for invite/resend,
-- and Team screen's direct .delete() call (owner-only, no Edge Function
-- needed) for revoke.
create policy "user can activate own admin_users row" on admin_users
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "owner can delete admin_users rows" on admin_users
  for delete using (is_owner());

-- Restricts the one client-reachable UPDATE path above to exactly
-- "flip my own status from pending to active" — nothing else, so an
-- invited user can't grant themselves a different role or rewrite their
-- own email. Doesn't apply to an owner acting on their own row (already
-- has full access, and the Edge Function/service_role path bypasses RLS
-- entirely regardless).
create or replace function enforce_admin_user_self_activation()
returns trigger as $$
begin
  if auth.uid() = old.id and not is_owner() then
    if new.role is distinct from old.role
      or new.email is distinct from old.email
      or old.status is distinct from 'pending'
      or new.status is distinct from 'active'
    then
      raise exception 'you can only activate your own pending invite';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger admin_users_enforce_self_activation
  before update on admin_users
  for each row execute function enforce_admin_user_self_activation();

-- Which admin login actually created a Blog Post row — kept separate from
-- author_name/credentials (the public byline), since a staff member's
-- login and their byline won't always match exactly.
alter table pages add column created_by uuid references auth.users(id);

-- Blog Post CRUD, rewritten for roles: owner can touch any Blog Post row,
-- staff only their own. Replaces the flat "any authenticated user"
-- policies from 0010_blog_post_crud.sql.
drop policy "authenticated can insert blog posts" on pages;
drop policy "authenticated can update blog posts" on pages;
drop policy "authenticated can delete blog posts" on pages;

create policy "admin can insert blog posts" on pages
  for insert
  with check (page_type = 'Blog Post' and (is_owner() or created_by = auth.uid()));

create policy "admin can update own blog posts" on pages
  for update
  using (page_type = 'Blog Post' and (is_owner() or created_by = auth.uid()))
  with check (page_type = 'Blog Post' and (is_owner() or created_by = auth.uid()));

create policy "admin can delete own blog posts" on pages
  for delete
  using (page_type = 'Blog Post' and (is_owner() or created_by = auth.uid()));

-- Website content (business info, testimonials, tier-gated page copy),
-- content suggestions, and leads/analytics are owner-only — staff's
-- access is scoped to blog posts only. Replaces the flat "any
-- authenticated user" policies from 0006_leads_status_update.sql and
-- 0011_content_permission_and_suggestions.sql.
drop policy "authenticated can update business" on business;
create policy "owner can update business" on business
  for update using (is_owner()) with check (is_owner());

drop policy "authenticated can update non-blog pages" on pages;
create policy "owner can update non-blog pages" on pages
  for update
  using (page_type <> 'Blog Post' and is_owner())
  with check (page_type <> 'Blog Post' and is_owner());

drop policy "authenticated can submit content suggestions" on content_suggestions;
drop policy "authenticated can read own content suggestions" on content_suggestions;
create policy "owner can submit content suggestions" on content_suggestions
  for insert with check (is_owner());
create policy "owner can read own content suggestions" on content_suggestions
  for select using (is_owner() and auth.uid() = submitted_by);

drop policy "authenticated can read leads" on leads;
drop policy "authenticated can update leads" on leads;
create policy "owner can read leads" on leads
  for select using (is_owner());
create policy "owner can update leads" on leads
  for update using (is_owner()) with check (is_owner());
