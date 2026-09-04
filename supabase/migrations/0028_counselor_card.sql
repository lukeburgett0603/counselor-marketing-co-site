-- Counselor Profile header card: specialties as linkable pills, an
-- availability-status pill, and self-service status editing for the
-- counselor it belongs to. See CLAUDE.md's "Counselor Profile header
-- card" section for the full reasoning.

-- Structured so a specialty can carry a real link — a flat comma-
-- separated string (the old "**Specialties:** A, B, C" line in `copy`)
-- can't. page_slug is null when no Service Hub/Service Page page
-- accurately matches that specialty — the template renders those as
-- plain, non-clickable pills rather than forcing an inaccurate link.
alter table pages add column specialties jsonb not null default '[]'::jsonb;

-- Nullable — no status shown on the public page until a real one is set
-- (see CLAUDE.md: never invent/guess a status). Only meaningful on
-- 'Counselor Profile' pages, same "not DB-enforced, just a convention"
-- approach as service_group on 'Service Page'.
alter table pages add column availability_status text
  check (availability_status in ('accepting', 'almost_full', 'not_accepting'));

-- Links a 'staff' admin_users row to the one Counselor Profile page they
-- may self-service their own availability_status on. Nullable — a plain
-- blog-only staff login just never sets this. on delete set null (not
-- cascade) — deleting the page shouldn't delete the login, just strand
-- the link.
alter table admin_users add column linked_counselor_page_id uuid references pages(id) on delete set null;

-- Row-level access: a linked staff login may reach (only) their own
-- Counselor Profile page via UPDATE. Column-level restriction (only
-- availability_status may actually change) is enforced by the trigger
-- below, the same "RLS can't do column-level checks" split used
-- throughout this project (see enforce_content_permission).
create policy "linked counselor can update own page" on pages
  for update
  using (
    page_type = 'Counselor Profile'
    and id = (
      select linked_counselor_page_id from admin_users
      where id = auth.uid() and role = 'staff' and status = 'active'
    )
  )
  with check (
    page_type = 'Counselor Profile'
    and id = (
      select linked_counselor_page_id from admin_users
      where id = auth.uid() and role = 'staff' and status = 'active'
    )
  );

-- Extends the existing content-permission trigger with a narrower,
-- separate carve-out: a linked-counselor staff login may touch
-- availability_status on their own page only — not even hero_subhead/
-- copy, which a full-tier owner could. Checked (and returns early)
-- before the owner/tier logic below, since it's a stricter, unrelated
-- path. The to_jsonb(...) diff (rather than hand-enumerating every other
-- column) automatically covers every existing and future column,
-- including this migration's own new `specialties` column.
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

  if exists (
    select 1 from admin_users
    where id = auth.uid() and role = 'staff' and status = 'active' and linked_counselor_page_id = old.id
  ) then
    if (to_jsonb(new) - 'availability_status' - 'updated_at')
      is distinct from (to_jsonb(old) - 'availability_status' - 'updated_at')
    then
      raise exception 'linked counselor logins may only update their own availability_status';
    end if;
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
