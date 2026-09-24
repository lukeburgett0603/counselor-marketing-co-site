-- Two more optional, self-service Counselor Profile fields, same
-- never-defaulted/guessed category as license_number:
--   - education: a free-text degree/institution line (e.g. "M.A. Clinical
--     Mental Health Counseling, Colorado Christian University"). Never
--     invented on a counselor's behalf — a counselor fills this in
--     themselves on admin/counselor-settings.astro, or it stays unset.
--   - professional_title: the spelled-out form of a counselor's short
--     `credentials` abbreviation (e.g. "Licensed Professional Counselor
--     Associate" for "LPCA"). Deliberately a free-text field rather than
--     an abbreviation->title lookup table: `credentials` is itself
--     free text (e.g. Tony Gore's is "LCSW, Owner/Director"), and a
--     lookup table would need a real, ever-growing taxonomy across every
--     license type this template's clients might ever use, with no
--     reliable way to parse a free-text credentials string against it.
--     A plain optional field matches the same self-service pattern as
--     license_number/education and generalizes to any future client's
--     licensing scheme without code changes.
alter table pages add column education text;
alter table pages add column professional_title text;

-- Fold both into the same linked-counselor self-service carve-out as
-- availability_status/telehealth_available/modalities/license_number.
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
    if (to_jsonb(new) - 'availability_status' - 'telehealth_available' - 'modalities' - 'license_number' - 'education' - 'professional_title' - 'updated_at')
      is distinct from (to_jsonb(old) - 'availability_status' - 'telehealth_available' - 'modalities' - 'license_number' - 'education' - 'professional_title' - 'updated_at')
    then
      raise exception 'linked counselor logins may only update their own availability_status, telehealth_available, modalities, license_number, education, and professional_title';
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
