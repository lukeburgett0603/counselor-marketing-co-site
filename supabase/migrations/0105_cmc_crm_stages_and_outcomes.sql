-- CMC only (never synced to the template). CRM phase 3 (2026-11-17):
-- two more sales stages, why a deal was lost, a date to check back in, and
-- a link from each client to the inquiry it came from.
-- Plan: ../crm/build-plan.md (in the knowledge-base folder).

-- Stages: Waiting, Contacted, Call booked, Plan sent, Became a client,
-- Not a fit, Lost. Existing values keep their meaning.
alter table public.leads drop constraint leads_status_check;
alter table public.leads add constraint leads_status_check
  check (status in ('new', 'contacted', 'call_booked', 'plan_sent', 'scheduled', 'referred', 'withdrawn'));

-- Why it ended (Not a fit or Lost), and when to try again.
alter table public.leads
  add column lost_reason text check (lost_reason in ('price', 'timing', 'competitor', 'no_response', 'diy', 'not_a_fit', 'other')),
  add column lost_note text,
  add column check_back_date date;

-- A won inquiry becomes a client. The dashboard address often isn't known
-- on the day they sign, so it can be filled in later.
alter table public.client_sites
  add column lead_id uuid references public.leads(id) on delete set null,
  alter column admin_url drop not null;
create unique index client_sites_lead_idx on public.client_sites (lead_id) where lead_id is not null;
