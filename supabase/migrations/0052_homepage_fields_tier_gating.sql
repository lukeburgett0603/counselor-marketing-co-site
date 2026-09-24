-- Extends enforce_content_permission() (0045_counselor_page_copy_access.sql)
-- so the 6 new Homepage-only brand-voice fields from the StoryBrand
-- rebuild get the same tier-gating as the existing hero/StoryBrand
-- columns: locked unless content_permission_level = 'full' or the
-- caller is agency. Not added to the linked-counselor allowlist —
-- that carve-out only ever matches a row where
-- linked_counselor_page_id = old.id, which is always a 'Counselor
-- Profile' row (see 0028_counselor_card.sql's RLS policy), so a
-- Homepage row is already unreachable by a linked-counselor session
-- regardless of what this trigger allows.
--
-- featured_on_homepage/homepage_feature_order/footer_column are
-- deliberately NOT added here — same "safe on every tier" category as
-- plan_steps/faqs/concerns/service_group (site-structure/taxonomy
-- fields, not brand-voice content).
create or replace function enforce_content_permission()
returns trigger
language plpgsql
as $function$
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
    if (to_jsonb(new)
        - 'availability_status' - 'telehealth_available' - 'modalities'
        - 'license_number' - 'education' - 'professional_title'
        - 'hero_subhead' - 'hero_headline'
        - 'storybrand_problem' - 'storybrand_guide_empathy' - 'storybrand_pitch'
        - 'storybrand_pitch_label' - 'storybrand_success' - 'storybrand_failure'
        - 'updated_at')
      is distinct from (to_jsonb(old)
        - 'availability_status' - 'telehealth_available' - 'modalities'
        - 'license_number' - 'education' - 'professional_title'
        - 'hero_subhead' - 'hero_headline'
        - 'storybrand_problem' - 'storybrand_guide_empathy' - 'storybrand_pitch'
        - 'storybrand_pitch_label' - 'storybrand_success' - 'storybrand_failure'
        - 'updated_at')
    then
      raise exception 'linked counselor logins may only update their own availability_status, telehealth_available, modalities, license_number, education, professional_title, hero_subhead, hero_headline, and the StoryBrand paragraph fields';
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
    or new.value_add_items is distinct from old.value_add_items
    or new.guide_authority_stats is distinct from old.guide_authority_stats
    or new.brandscript_one_liner is distinct from old.brandscript_one_liner
    or new.brandscript_teaser is distinct from old.brandscript_teaser
    or new.brandscript_full is distinct from old.brandscript_full
    or new.brandscript_video_url is distinct from old.brandscript_video_url
  then
    select content_permission_level into tier from business limit 1;
    if tier is distinct from 'full' then
      raise exception 'this field is protected on your current plan — submit a suggestion instead';
    end if;
  end if;

  return new;
end;
$function$;
