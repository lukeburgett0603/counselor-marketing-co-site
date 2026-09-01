-- Lead CRM: notes, follow-up dates, and a detail view for the Leads and
-- analytics table, split onto its own admin/crm.astro page (not merged
-- into admin/leads.astro) — the client explicitly wants Leads and
-- analytics to stay a clean "proof of value" dashboard, with CRM-style
-- lead management as a separate tool built on top of the same `leads`
-- rows. Same owner/agency access as the rest of lead management —
-- staff is out of scope until "assign leads to staff" is built later.

alter table leads add column follow_up_date date;

-- Free-text, timestamped, append-only — a running log, not an editable
-- field. No update/delete policy: notes are never edited or removed in
-- v1, matching a real call-log/activity-log mental model. Add that later
-- if a real need for correcting a note shows up.
create table lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  note text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table lead_notes enable row level security;

create policy "admin can read lead notes" on lead_notes
  for select using (is_owner() or is_agency());
create policy "admin can insert lead notes" on lead_notes
  for insert with check (is_owner() or is_agency());
