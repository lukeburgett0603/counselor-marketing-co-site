-- Service Area's comprehensive-depth collapsed field, the same
-- scannability/SEO-depth split already built for Homepage
-- (brandscript_full) and Service Page (storybrand_pitch, via
-- CollapsibleSection): the visible `copy` field stays short and
-- scannable (Light tier was always meant to be brief), and this field
-- carries the genuinely unique, location-specific substance a Service
-- Area page needs to hit its 800-1,500 word SEO target, rendered
-- collapsed by default so it doesn't force every visitor to read past a
-- wall of text to reach the form. See webpage-copywriter's page-types.md
-- and frontend-site-builder-supabase's page-templates.md (Service Area
-- section) for the full reasoning. Never a templated paste across
-- locations — see page-types.md's note on thin/duplicate-content risk.
alter table pages add column local_area_detail text;

-- Same tier-gating as `copy` and every other brand-voice content field —
-- locked unless content_permission_level = 'full' or the caller is
-- agency. Added from the start, not as a follow-up fix (see CLAUDE.md's
-- "Real bugs found and fixed here" list on what happens when a new
-- content field gets populated before it's gated).
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
    or new.local_area_detail is distinct from old.local_area_detail
  then
    select content_permission_level into tier from business limit 1;
    if tier is distinct from 'full' then
      raise exception 'this field is protected on your current plan — submit a suggestion instead';
    end if;
  end if;

  return new;
end;
$function$;
