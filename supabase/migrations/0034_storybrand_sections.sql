-- Splits the flowing `copy` narrative into 5 distinct StoryBrand-section
-- columns, but only meaningfully used on the 3 page types short/compact
-- enough that the whole page basically *is* one pass through the story
-- arc: Homepage, Service Page, Counselor Profile. Content Pillar and
-- Service Hub deliberately keep `copy` as one long-form field — both are
-- long-form, TOC-organized informational content (1,800+ words), and
-- forcing a rigid 5-beat sales narrative onto that shape risks reading as
-- promotional rather than helpful, which is a real SEO/E-E-A-T risk for
-- pages meant to rank on informational intent, not just a style
-- preference. See CLAUDE.md's "StoryBrand section-by-section copy
-- editing" section for the full reasoning.
--
-- Maps onto the 4 wireframe sections in storybrand-framework.md that
-- don't already have a dedicated column (Plan already has `plan_steps`,
-- Guide's Authority already has `testimonial_quote`/`concerns`, the
-- Direct CTA already has `cta_heading`/`cta_button_text`):
--   storybrand_problem       -> wireframe section 3 (Stakes/Problem)
--   storybrand_guide_empathy -> wireframe section 4's Empathy half
--   storybrand_pitch         -> wireframe section 6 (Explanatory paragraph)
--   storybrand_success       -> wireframe section 7 (Success vision)
--   storybrand_failure       -> wireframe section 8 (Failure/stakes reminder)
alter table pages add column storybrand_problem text;
alter table pages add column storybrand_guide_empathy text;
alter table pages add column storybrand_pitch text;
alter table pages add column storybrand_success text;
alter table pages add column storybrand_failure text;

-- Joins the same tier-gated group as hero_subhead/copy/images in
-- enforce_content_permission() — these 5 columns carry the same
-- brand-voice/SEO-sensitive narrative content `copy` used to carry for
-- these page types, so they need the same server-side enforcement, not
-- just a UI grouping. Same "add it to the check from the start" discipline
-- as hero_image_focal_y in 0031.
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
    or new.storybrand_problem is distinct from old.storybrand_problem
    or new.storybrand_guide_empathy is distinct from old.storybrand_guide_empathy
    or new.storybrand_pitch is distinct from old.storybrand_pitch
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
