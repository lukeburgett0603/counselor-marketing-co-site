-- Caseload tracking: measure clients, not just leads.
--
-- Three pieces, all feeding the new Caseload dashboard
-- (admin/analytics/caseload.astro):
--   1. A lead marked `scheduled` is the "became a client" metric. It
--      needs a real timestamp (`scheduled_at`) so "new clients this
--      month" counts when they became a client, not when they first
--      filled out the form.
--   2. `assigned_counselor_page_id` credits that client to a specific
--      counselor in a group practice. Prefilled from the lead's own
--      `preferred_counselor_page_id` but editable in the Lead CRM, since
--      intake often matches someone with a different counselor than the
--      one they first picked.
--   3. `counselor_caseload` holds each counselor's weekly-client target
--      and current active client count. Its own table, NOT columns on
--      `pages`: `pages` is publicly readable ("public can read pages"),
--      and a counselor's caseload is private business data that never
--      renders on the site. Keeping it off `pages` also means saving it
--      needs no rebuild and no carve-out in enforce_content_permission().
--
-- Target caseload is NOT stored — it's derived in app code
-- (lib/caseload.ts, weekly target x 1.5) so the rule-of-thumb multiplier
-- can change in one place without a data migration.

alter table leads add column assigned_counselor_page_id uuid references pages(id) on delete set null;
alter table leads add column scheduled_at timestamptz;

-- Backfill. Existing scheduled leads have no record of when they were
-- scheduled, so created_at is the closest honest approximation.
update leads
  set assigned_counselor_page_id = preferred_counselor_page_id
  where assigned_counselor_page_id is null and preferred_counselor_page_id is not null;
update leads
  set scheduled_at = created_at
  where status = 'scheduled' and scheduled_at is null;

-- Maintained by trigger, not app code, so every write path (contact form
-- Edge Function, CRM "+ Add lead", any status select) stays consistent.
create or replace function set_lead_caseload_fields()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.assigned_counselor_page_id is null then
      new.assigned_counselor_page_id := new.preferred_counselor_page_id;
    end if;
    if new.status = 'scheduled' and new.scheduled_at is null then
      new.scheduled_at := now();
    end if;
  else
    if new.status = 'scheduled' and old.status is distinct from 'scheduled' then
      new.scheduled_at := now();
    elsif new.status is distinct from 'scheduled' then
      -- Moved back out of scheduled (a mis-click, or they never showed):
      -- they no longer count as a new client.
      new.scheduled_at := null;
    end if;
  end if;
  return new;
end;
$$;

create trigger leads_caseload_fields
  before insert or update on leads
  for each row execute function set_lead_caseload_fields();

create table counselor_caseload (
  counselor_page_id uuid primary key references pages(id) on delete cascade,
  weekly_client_target integer check (weekly_client_target between 1 and 60),
  current_active_clients integer check (current_active_clients between 0 and 200),
  updated_at timestamptz not null default now()
);

alter table counselor_caseload enable row level security;

-- Owner/agency: every counselor (the practice-wide dashboard sums them).
-- Linked counselor: only their own row, same linked_counselor_page_id
-- pattern as "linked counselor can update own page" (0028).
create policy "admin can read caseload" on counselor_caseload
  for select using (
    is_owner() or is_agency()
    or counselor_page_id = (
      select linked_counselor_page_id from admin_users
      where id = auth.uid() and role = 'staff' and status = 'active'
    )
  );

create policy "admin can insert caseload" on counselor_caseload
  for insert with check (
    is_owner() or is_agency()
    or counselor_page_id = (
      select linked_counselor_page_id from admin_users
      where id = auth.uid() and role = 'staff' and status = 'active'
    )
  );

create policy "admin can update caseload" on counselor_caseload
  for update
  using (
    is_owner() or is_agency()
    or counselor_page_id = (
      select linked_counselor_page_id from admin_users
      where id = auth.uid() and role = 'staff' and status = 'active'
    )
  )
  with check (
    is_owner() or is_agency()
    or counselor_page_id = (
      select linked_counselor_page_id from admin_users
      where id = auth.uid() and role = 'staff' and status = 'active'
    )
  );
