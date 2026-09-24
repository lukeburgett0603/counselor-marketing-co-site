-- Two corrections to 0061's content_plan_items, found by actually using
-- the screen: the board's "Keyword" column was rendering search_volume,
-- not the keyword, because keyword text was never denormalized onto
-- this table the way search_volume/priority already were — staff has
-- no SELECT access to target_keywords, so a join can't fix this. And
-- the "Draft blog post" hand-off (admin/blog.astro <-> admin/
-- content-plan.astro) needs a staff caller to be able to record which
-- real page resulted from their own completed assignment, which
-- 0061's enforce_content_plan_staff_update() trigger doesn't currently
-- allow. See CLAUDE.md's "Content Planning & Management screen"
-- section for the full story.

alter table content_plan_items add column keyword text;

-- Recreates the trigger function to also exempt linked_page_id for a
-- non-owner/non-agency caller — a narrow, well-justified extension of
-- "acting on your own assignment" (recording the real page their own
-- work produced), not a broadening of what else they can touch.
create or replace function enforce_content_plan_staff_update()
returns trigger as $$
begin
  if not is_owner() and not is_agency() then
    if to_jsonb(new) - 'status' - 'notes' - 'linked_page_id' - 'updated_at'
       is distinct from to_jsonb(old) - 'status' - 'notes' - 'linked_page_id' - 'updated_at'
    then
      raise exception 'you can only update status, notes, and linked_page_id on your own assigned content plan items';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;
