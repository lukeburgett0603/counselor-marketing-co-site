-- A counselor's professional license number (e.g. "LPCA #12345"), shown
-- in the header card next to credentials and on the Counselors Overview
-- grid — same self-service field category as availability_status/
-- telehealth_available/modalities, never defaulted/guessed. Only
-- meaningful on a 'Counselor Profile' page.
alter table pages add column license_number text;

-- Fold license_number into the same linked-counselor self-service
-- carve-out as availability_status/telehealth_available/modalities
-- (0011_content_permission_and_suggestions.sql, extended in
-- 0029_counselor_card_v2.sql) — without this, a linked counselor's own
-- login would hit the "may only update availability_status,
-- telehealth_available, and modalities" exception the moment they tried
-- to save a license number on admin/counselor-settings.astro.
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
    if (to_jsonb(new) - 'availability_status' - 'telehealth_available' - 'modalities' - 'license_number' - 'updated_at')
      is distinct from (to_jsonb(old) - 'availability_status' - 'telehealth_available' - 'modalities' - 'license_number' - 'updated_at')
    then
      raise exception 'linked counselor logins may only update their own availability_status, telehealth_available, modalities, and license_number';
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
    or new.storybrand_problem is distinct from old.storybrand_problem
    or new.storybrand_guide_empathy is distinct from old.storybrand_guide_empathy
    or new.storybrand_pitch is distinct from old.storybrand_pitch
    or new.storybrand_pitch_label is distinct from old.storybrand_pitch_label
    or new.storybrand_success is distinct from old.storybrand_success
    or new.storybrand_failure is distinct from old.storybrand_failure
  then
    select content_permission_level into tier from business limit 1;
    if tier is distinct from 'full' then
      raise exception 'this field is protected on your current plan — submit a suggestion instead';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;
