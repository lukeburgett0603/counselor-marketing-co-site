-- Counselor Profile header card v2: telehealth pill, and a dynamic
-- modalities section — both self-service, same as availability_status.
-- See CLAUDE.md's "Counselor Profile header card" section.

-- Boolean, not tri-state — a counselor either offers telehealth or
-- doesn't; unlike availability_status there's no meaningful third
-- "unset" state to distinguish from "no". Defaults false (no pill) for
-- every counselor at launch, same never-invent/guess discipline as
-- availability_status — each counselor turns it on themselves.
alter table pages add column telehealth_available boolean not null default false;

-- Plain string tags ("EMDR", "ACT", "CBT", ...), not a {label, page_slug}
-- shape like specialties — these don't link anywhere, they're just a
-- counselor's own list of clinical training/approaches. jsonb (not a
-- native text[]) to match every other list-shaped pages column
-- (plan_steps, faqs, concerns, specialties) in this app.
alter table pages add column modalities jsonb not null default '[]'::jsonb;

-- Extends the linked-counselor self-service carve-out (see
-- 0028_counselor_card.sql) to the two new fields — a linked counselor
-- may now touch availability_status, telehealth_available, and
-- modalities on their own page, still nothing else. The to_jsonb(...)
-- diff approach means this is just two more subtracted keys, not a
-- rewritten check.
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
  then
    select content_permission_level into tier from business limit 1;
    if tier is distinct from 'full' then
      raise exception 'this field is protected on your current plan — submit a suggestion instead';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;
