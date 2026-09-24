-- Content Planning & Management: a workflow layer on top of the SEO
-- Insights data (target_keywords, keyword_gap_snapshots) — tracks who's
-- writing what, in what format, by when. Deliberately not a second
-- source of truth: the SEO Insights page's own Content Gap list is
-- already computed live from real pages' focus_keyword, so a keyword
-- drops off that list automatically the moment a real page exists for
-- it. This table only tracks the human workflow state that doesn't
-- exist anywhere else. See CLAUDE.md's "Content Planning & Management
-- screen" section.

create table content_plan_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  -- Set only when this idea came from a real target_keywords row (the
  -- Content Gap list) — null for competitor-gap-derived or manual
  -- ideas, since keyword_gap_snapshots rows are weekly/ephemeral and
  -- not worth FK'ing against long-term.
  target_keyword_id uuid references target_keywords(id) on delete set null,
  -- Denormalized copies, not a live join — content_plan_items must stay
  -- fully readable by a 'staff' session, which has no SELECT access to
  -- target_keywords at all. Copied once at creation time.
  search_volume integer,
  priority text check (priority in ('high', 'medium', 'low')),
  -- Free text explaining where this idea came from when it isn't a
  -- target keyword (e.g. "Competitor gap: carmenscounseling.com ranks
  -- for this" or "Manual idea").
  source_note text,
  -- Manually researched via Mangools' web UI Questions tab — no API
  -- access exists for this (confirmed live: the related-keywords
  -- endpoint has no question-format data or field at all), so this
  -- stays a plain optional field filled in by whoever did the research.
  target_question text,
  content_type text not null default 'undecided'
    check (content_type in ('blog_post', 'service_page', 'who_we_serve_page', 'update_existing_page', 'undecided')),
  -- Which existing page this either updates, or (once published) the
  -- real new page/post this idea became — one field serves both.
  linked_page_id uuid references pages(id) on delete set null,
  category text,
  status text not null default 'idea' check (status in ('idea', 'assigned', 'drafted', 'published')),
  assigned_to uuid references auth.users(id) on delete set null,
  due_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger content_plan_items_set_updated_at
  before update on content_plan_items
  for each row execute function set_updated_at();

alter table content_plan_items enable row level security;

create policy "owner and agency can view content plan" on content_plan_items
  for select using (is_owner() or is_agency());
create policy "owner and agency can insert content plan items" on content_plan_items
  for insert with check (is_owner() or is_agency());
create policy "owner and agency can update content plan items" on content_plan_items
  for update using (is_owner() or is_agency()) with check (is_owner() or is_agency());
create policy "owner and agency can delete content plan items" on content_plan_items
  for delete using (is_owner() or is_agency());

-- Staff sees and can act on ONLY their own assigned items — a new,
-- narrower row-scoping shape than the existing linked-counselor-to-page
-- pattern, but the same idea: scope by a column match, not by role
-- alone.
create policy "staff can view own assigned content plan items" on content_plan_items
  for select using (assigned_to = auth.uid());
create policy "staff can update own assigned content plan items" on content_plan_items
  for update using (assigned_to = auth.uid()) with check (assigned_to = auth.uid());

-- The UPDATE policy above only gates *that* a staff caller may touch
-- their own row — it can't restrict *which columns*. This trigger is
-- what actually restricts a non-owner/non-agency caller to status/
-- notes only, same "diff old vs new, reject anything else changed"
-- shape as enforce_content_permission()'s linked-counselor branch.
create or replace function enforce_content_plan_staff_update()
returns trigger as $$
begin
  if not is_owner() and not is_agency() then
    if to_jsonb(new) - 'status' - 'notes' - 'updated_at'
       is distinct from to_jsonb(old) - 'status' - 'notes' - 'updated_at'
    then
      raise exception 'you can only update status and notes on your own assigned content plan items';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger content_plan_items_enforce_staff_update
  before update on content_plan_items
  for each row execute function enforce_content_plan_staff_update();
