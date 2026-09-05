-- Lets a hero image's crop favor its actual subject instead of always
-- centering on the frame. A photo with the subject positioned low in
-- frame (headroom, rule-of-thirds compositions, etc.) gets clipped
-- across the subject under a plain centered crop, since "centered on
-- the frame" isn't the same as "centered on the subject." See
-- CLAUDE.md's "Hero image focal point" section for the full reasoning.
alter table pages add column hero_image_focal_y text not null default 'center'
  check (hero_image_focal_y in ('top', 'center', 'bottom'));

-- Joins the same tier-gated group as hero_style/hero_overlay_color/
-- hero_overlay_opacity in enforce_content_permission() — it's edited
-- right alongside the hero image in admin/content.astro, so it needs
-- the same server-side enforcement, not just a UI grouping. Learned
-- this the hard way with the three hero_overlay_* columns in
-- 0030_hero_overlay_style.sql; adding this column to the same check
-- from the start rather than as a follow-up fix.
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
    or new.hero_image_focal_y is distinct from old.hero_image_focal_y
  then
    select content_permission_level into tier from business limit 1;
    if tier is distinct from 'full' then
      raise exception 'this field is protected on your current plan — submit a suggestion instead';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;
