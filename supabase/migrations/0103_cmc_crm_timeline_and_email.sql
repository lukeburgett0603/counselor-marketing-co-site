-- CMC only (never synced to the template). CRM phase 1 (2026-11-08):
-- reply from the admin, one timeline per prospect, a next step on every
-- open prospect, and the audit follow-ups pause once Luke steps in.
-- Plan: ../crm/build-plan.md (in the knowledge-base folder).

-- leads: the next step (its date stays in follow_up_date, which Today and
-- the due list already read), the private reply address, and the pause.
alter table public.leads
  add column next_step text,
  add column reply_token text unique default replace(gen_random_uuid()::text, '-', ''),
  add column followups_paused_at timestamptz,
  add column first_reply_at timestamptz,
  add column last_activity_at timestamptz,
  add column unread_reply_at timestamptz;

update public.leads set reply_token = replace(gen_random_uuid()::text, '-', '') where reply_token is null;
update public.leads set last_activity_at = created_at where last_activity_at is null;

-- Every email to or from a prospect. Outbound rows are written by
-- send-lead-email; inbound rows (phase 2) by receive-lead-email.
create table public.lead_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  direction text not null check (direction in ('out', 'in')),
  from_email text,
  to_email text,
  subject text,
  body_text text,
  body_html text,
  resend_id text,
  message_id text,
  in_reply_to text,
  template_id uuid,
  sent_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index lead_messages_lead_idx on public.lead_messages (lead_id, created_at desc);

-- Everything else on the timeline: stage changes (trigger below), audit
-- follow-ups sent, audit opens, calls logged, follow-ups paused/resumed.
create table public.lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  kind text not null,
  detail jsonb not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index lead_events_lead_idx on public.lead_events (lead_id, created_at desc);

-- Saved emails for the compose box. Merge fields are filled in the admin
-- before sending, so Luke always sees the final text.
create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null default '',
  body text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lead_messages enable row level security;
alter table public.lead_events enable row level security;
alter table public.email_templates enable row level security;

create policy "admins can read lead messages" on public.lead_messages
  for select using (is_owner() or is_agency());
-- Writes go through the Edge Functions (service role) only.

create policy "admins can read lead events" on public.lead_events
  for select using (is_owner() or is_agency());
create policy "admins can log lead events" on public.lead_events
  for insert with check ((is_owner() or is_agency()) and created_by = auth.uid());

create policy "admins manage email templates" on public.email_templates
  for all using (is_owner() or is_agency()) with check (is_owner() or is_agency());

-- Stage changes land on the timeline by themselves, whoever makes them.
-- Moving past Contacted also pauses the audit follow-ups.
create or replace function public.log_lead_stage_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into lead_events (lead_id, kind, detail, created_by)
    values (new.id, 'stage', jsonb_build_object('from', coalesce(old.status, 'new'), 'to', coalesce(new.status, 'new')), auth.uid());
    new.last_activity_at := now();
    if coalesce(new.status, 'new') not in ('new', 'contacted') and new.followups_paused_at is null then
      new.followups_paused_at := now();
    end if;
  end if;
  return new;
end $$;

create trigger leads_log_stage_change
  before update of status on public.leads
  for each row execute function public.log_lead_stage_change();

-- Notes count as activity too.
create or replace function public.touch_lead_activity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update leads set last_activity_at = now() where id = new.lead_id;
  return new;
end $$;

create trigger lead_notes_touch_activity
  after insert on public.lead_notes
  for each row execute function public.touch_lead_activity();
create trigger lead_events_touch_activity
  after insert on public.lead_events
  for each row when (new.kind not in ('stage', 'audit_opened'))
  execute function public.touch_lead_activity();
