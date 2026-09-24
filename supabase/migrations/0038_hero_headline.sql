-- An optional persuasive tagline for the H1 slot on a Counselor Profile
-- page (e.g. "Helping boys and men reclaim peace, clarity, and
-- purpose."), distinct from the counselor's own name — the name still
-- renders prominently elsewhere in the header card, just no longer as
-- the literal <h1> text. Null falls back to the counselor's name
-- (page.title), so every existing Counselor Profile keeps rendering
-- exactly as before until someone opts in. Only meaningful on a
-- 'Counselor Profile' page today — admin/content/page-copy.astro gates
-- the field's visibility to that page_type, same pattern as the
-- Counselor-Profile-only hero-style hiding already in that file.
alter table pages add column hero_headline text;

-- Same tier-gated group as hero_subhead/storybrand_* — this is narrative/
-- brand-voice content like those fields, not a self-service fact like
-- license_number, so it follows the content-permission tier rather than
-- the linked-counselor carve-out.
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
    or new.hero_headline is distinct from old.hero_headline
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
