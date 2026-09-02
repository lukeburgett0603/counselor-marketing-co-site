-- Lead Magnet nurture sequences: a fixed 4-email drip (Day 0 / 3 / 7 / 14
-- after signup, hardcoded as SEQUENCE_SCHEDULE_DAYS in both
-- admin/lead-magnets.astro and the send-nurture-emails Edge Function, not
-- admin-editable) sent to anyone who downloads a lead magnet — moving
-- them from "got the PDF" toward booking. Distinct from the (backlogged)
-- CRM direct-communication idea: this is automated/scheduled, not a
-- one-off send from a person.

create table lead_magnet_sequence_steps (
  id uuid primary key default gen_random_uuid(),
  lead_magnet_id uuid not null references lead_magnets(id) on delete cascade,
  -- 1-4, corresponding by position to the fixed day-offset schedule.
  step_order int not null check (step_order between 1 and 4),
  subject text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_magnet_id, step_order)
);

create trigger lead_magnet_sequence_steps_set_updated_at
  before update on lead_magnet_sequence_steps
  for each row execute function set_updated_at();

alter table lead_magnet_sequence_steps enable row level security;

-- No public read policy — unlike lead_magnets itself, this content is
-- never rendered on the public site. Only the admin authoring UI
-- (owner/agency sessions) and the sending Edge Function (service_role,
-- bypasses RLS entirely) ever read it.
create policy "admin can read sequence steps" on lead_magnet_sequence_steps
  for select using (is_owner() or is_agency());
create policy "admin can insert sequence steps" on lead_magnet_sequence_steps
  for insert with check (is_owner() or is_agency());
create policy "admin can update sequence steps" on lead_magnet_sequence_steps
  for update using (is_owner() or is_agency()) with check (is_owner() or is_agency());
create policy "admin can delete sequence steps" on lead_magnet_sequence_steps
  for delete using (is_owner() or is_agency());

-- Enrollment/progress tracking lives directly on `leads`, not a separate
-- join table — a lead can only ever be enrolled in the single sequence
-- tied to their own lead_magnet_id, a true 1:1 relationship.
alter table leads add column sequence_next_step int not null default 1;
alter table leads add column sequence_last_sent_at timestamptz;
alter table leads add column sequence_unsubscribed_at timestamptz;
