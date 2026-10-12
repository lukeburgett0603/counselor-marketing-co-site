-- Admin redesign phase 2 (2026-10-06): a counselor's personal "Today"
-- screen shows their own inquiries, so a linked-counselor login needs to
-- read the leads assigned to them, and nothing else. Until now only
-- owner/agency could read `leads` at all (0013).
--
-- "Linked counselor" = an active 'staff' admin_users row with
-- linked_counselor_page_id set (0028). Same pattern as counselor_caseload
-- (0066), pulled into one SECURITY DEFINER helper so policies on other
-- tables can reuse it without re-querying admin_users under its own RLS.

create or replace function linked_counselor_page_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select linked_counselor_page_id from admin_users
  where id = auth.uid() and role = 'staff' and status = 'active'
$$;

-- Read: only leads assigned to their own counselor page. An unassigned
-- lead (assigned_counselor_page_id null) never matches.
create policy "linked counselor can read assigned leads" on leads
  for select using (
    assigned_counselor_page_id is not null
    and assigned_counselor_page_id = linked_counselor_page_id()
  );

-- Update: same rows, and the row must still be theirs afterward (they
-- can't reassign a lead to someone else).
create policy "linked counselor can update assigned leads" on leads
  for update
  using (
    assigned_counselor_page_id is not null
    and assigned_counselor_page_id = linked_counselor_page_id()
  )
  with check (
    assigned_counselor_page_id is not null
    and assigned_counselor_page_id = linked_counselor_page_id()
  );

-- RLS can't limit which columns change, so a trigger does: a linked
-- counselor (who isn't also owner/agency) may move a lead's status and
-- follow-up date, nothing else. scheduled_at / first_contacted_at are
-- allowed because the existing triggers (0066, 0067) set them from the
-- status change itself; the jsonb diff is robust to future columns.
create or replace function enforce_counselor_lead_update()
returns trigger
language plpgsql
as $$
declare
  allowed text[] := array['status', 'follow_up_date', 'scheduled_at', 'first_contacted_at'];
begin
  if is_owner() or is_agency() or auth.uid() is null then
    return new;
  end if;
  if linked_counselor_page_id() is not null
     and (to_jsonb(new) - allowed) is distinct from (to_jsonb(old) - allowed) then
    raise exception 'Counselors can change only an inquiry''s status and follow-up date.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- "zz" so it runs after the 0066/0067 BEFORE triggers (Postgres fires
-- same-event triggers alphabetically), and so sees their final values.
create trigger leads_zz_counselor_guard
  before update on leads
  for each row execute function enforce_counselor_lead_update();
