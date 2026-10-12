-- Admin redesign follow-ups (2026-10-06, Luke's decisions):
--   1. A real name for each admin login, set on the Team page, so Today
--      can greet people by name instead of guessing from their email.
--   2. The caseload count updates itself when an inquiry becomes a client.

-- ------------------------------------------------------------ 1. names

alter table admin_users add column display_name text
  check (display_name is null or char_length(display_name) between 1 and 80);

-- admin_users has no general UPDATE policy (invites and links go through
-- the publish-site Edge Function), so names go through this one narrow
-- function instead of a broad policy. Allowed: your own name; or an
-- owner/agency setting anyone's, except that only agency renames agency.
create or replace function set_admin_user_name(target_id uuid, new_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role text;
  cleaned text := nullif(btrim(new_name), '');
begin
  select role into target_role from admin_users where id = target_id;
  if target_role is null then
    raise exception 'No such team member.' using errcode = 'P0001';
  end if;
  if not (
    target_id = auth.uid()
    or is_agency()
    or (is_owner() and target_role <> 'agency')
  ) then
    raise exception 'You can''t change this person''s name.' using errcode = 'P0001';
  end if;
  update admin_users set display_name = cleaned where id = target_id;
end;
$$;

-- The self-activation guard (0012) blocks any change to your own row
-- except pending -> active. Let a name-only change through; everything
-- else it protects (role, email, status) is unchanged.
create or replace function enforce_admin_user_self_activation()
returns trigger as $$
begin
  if auth.uid() = old.id and not is_owner() then
    if new.role is not distinct from old.role
      and new.email is not distinct from old.email
      and new.status is not distinct from old.status
      and new.linked_counselor_page_id is not distinct from old.linked_counselor_page_id
    then
      return new;
    end if;
    if new.role is distinct from old.role
      or new.email is distinct from old.email
      or old.status is distinct from 'pending'
      or new.status is distinct from 'active'
    then
      raise exception 'you can only activate your own pending invite';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

revoke all on function set_admin_user_name(uuid, text) from public;
grant execute on function set_admin_user_name(uuid, text) to authenticated;

-- ------------------------------------------------ 2. automatic caseload

-- When an inquiry moves to Scheduled, its counselor's current_active_clients
-- goes up by one; moving it back out (a mis-click, a no-show), deleting
-- it, or reassigning it moves the count with it. Clients finishing
-- treatment still lower the count by hand on Counselor settings: the
-- inquiry record doesn't know when therapy ends.
--
-- Counts only toward a counselor who has a caseload row (a weekly target
-- set); it never creates one. An unassigned inquiry counts toward the
-- only counselor when the practice has exactly one (a solo practice).
-- updated_at is left alone: it means "a person last confirmed this count".

create or replace function caseload_page_for(page_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    page_id,
    (select case when count(*) = 1 then min(id::text)::uuid end
       from pages where page_type = 'Counselor Profile')
  )
$$;

create or replace function sync_caseload_with_scheduled_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_page uuid;
  new_page uuid;
begin
  if tg_op in ('UPDATE', 'DELETE') and old.status = 'scheduled' then
    old_page := caseload_page_for(old.assigned_counselor_page_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.status = 'scheduled' then
    new_page := caseload_page_for(new.assigned_counselor_page_id);
  end if;
  if old_page is not distinct from new_page then
    return null;
  end if;
  if old_page is not null then
    update counselor_caseload
      set current_active_clients = greatest(0, coalesce(current_active_clients, 0) - 1)
      where counselor_page_id = old_page;
  end if;
  if new_page is not null then
    update counselor_caseload
      set current_active_clients = least(200, coalesce(current_active_clients, 0) + 1)
      where counselor_page_id = new_page;
  end if;
  return null;
end;
$$;

create trigger leads_sync_caseload
  after insert or update of status, assigned_counselor_page_id or delete on leads
  for each row execute function sync_caseload_with_scheduled_lead();
