-- CMC only (never synced to the template). CRM phase 4 (2026-11-17):
-- one record per person, and a light practice grouping.
-- Decided by Luke: when someone with an inquiry reaches out again (same
-- email: a second audit, the contact form, the calculator), it joins
-- their existing record instead of creating a new one (submit-lead). A
-- Lost / Not a fit record goes back to Waiting. Practices are matched by
-- website or work-email domain; deal and stage stay on the person.

alter table public.leads
  add column practice_name text,
  add column practice_domain text,
  add column returned_at timestamptz,
  add column return_count integer not null default 0,
  add column unread_return_at timestamptz;

create index leads_email_lower_idx on public.leads (lower(email));
create index leads_practice_domain_idx on public.leads (practice_domain) where practice_domain is not null;
