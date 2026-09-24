-- Extends the linked-counselor carve-out in enforce_content_permission()
-- (originally 0029_counselor_card_v2.sql) so a linked staff login can
-- also directly edit their own page's hero tagline and the 5 StoryBrand
-- narrative fields — no "suggest an edit" review queue for these,
-- unlike a restricted-tier owner. Explicit product decision: the goal
-- is fewer change requests reaching the agency, trading the review
-- safety net for real, in-editor writing guidance instead (see
-- admin/content/page-copy.astro's counselor-facing guidance panel,
-- built alongside this, and keyword-usage-rules.md's schema-alignment
-- rule this panel exists to make concrete for a non-copywriter).
--
-- h1/meta_description/focus_keyword stay exactly as protected as
-- before — they were never in this branch's allowlist and still
-- aren't. `copy`/`images`/hero layout fields also stay out of scope
-- deliberately: Counselor Profile pages always use the StoryBrand
-- split (never the plain `copy` field) and don't render Hero.astro at
-- all, so `copy`/hero_style/overlay fields are irrelevant to this page
-- type; `images` (their headshot) was a deliberate scope cut for this
-- pass, not an oversight — add it later if a real need shows up.
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
  then
    select content_permission_level into tier from business limit 1;
    if tier is distinct from 'full' then
      raise exception 'this field is protected on your current plan — submit a suggestion instead';
    end if;
  end if;

  return new;
end;
$function$;
