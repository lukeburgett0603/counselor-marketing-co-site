-- A second Hero layout: full-bleed background image with a tintable
-- color overlay for legibility, H1/subhead on top of it, and (when the
-- page has one) its aside form rendered as a frosted-glass card instead
-- of side-by-side with the image. See CLAUDE.md's "Hero overlay style"
-- section for the full reasoning. Opt-in per page — every existing page
-- on every existing client site keeps today's exact layout by default.
alter table pages add column hero_style text not null default 'default'
  check (hero_style in ('default', 'overlay'));

-- Real DB defaults (not null) rather than falling back at render time —
-- a page that switches to 'overlay' without touching these gets a
-- sensible, legible dark tint immediately, adjustable from there.
alter table pages add column hero_overlay_color text not null default '#1f2937';
alter table pages add column hero_overlay_opacity integer not null default 50
  check (hero_overlay_opacity between 0 and 100);

-- These three join the same tier-gated group as hero_subhead/copy/images
-- in enforce_content_permission() — admin/content.astro's UI bundles
-- them under the same "Hero image" field for exactly this reason (a
-- hero layout choice is closely tied to the hero image itself), so the
-- server-side enforcement needs to match, not just the UI. Without this,
-- a restricted-tier owner would have the controls hidden client-side but
-- could still flip hero_style via a direct REST call — UI theater, not
-- real enforcement, the same trap this trigger already exists to avoid.
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
    if (to_jsonb(new) - 'availability_status' - 'telehealth_available' - 'modalities' - 'updated_at')
      is distinct from (to_jsonb(old) - 'availability_status' - 'telehealth_available' - 'modalities' - 'updated_at')
    then
      raise exception 'linked counselor logins may only update their own availability_status, telehealth_available, and modalities';
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
    or new.hero_style is distinct from old.hero_style
    or new.hero_overlay_color is distinct from old.hero_overlay_color
    or new.hero_overlay_opacity is distinct from old.hero_overlay_opacity
  then
    select content_permission_level into tier from business limit 1;
    if tier is distinct from 'full' then
      raise exception 'this field is protected on your current plan — submit a suggestion instead';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;
