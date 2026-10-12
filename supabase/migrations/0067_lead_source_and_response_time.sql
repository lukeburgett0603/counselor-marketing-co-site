-- Measurement for the Full Caseload System: where leads come from, and
-- how fast the practice responds to them.
--
-- 1. lead_source: the visitor's own answer to "How did you hear about
--    us?" on the lead form (values listed in src/lib/leadSource.ts). This
--    is what lets the dashboard show that search, maps, and referral
--    partners each produce clients. Opt-in per business
--    (collect_lead_source), same pattern as collect_counselor_preference.
--    No CHECK constraint on purpose: a stale or unknown value must never
--    make the whole lead insert fail. submit-lead sanitizes to its own
--    allowlist instead.
-- 2. lead_source_detail: optional free text for referral answers ("Dr.
--    Smith's office", "Grace Church"), used later to link a lead to a
--    tracked referral partner.
-- 3. first_contacted_at: speed to lead. Set by trigger the first time a
--    lead's status leaves 'new'. It measures when the practice recorded
--    contact in the CRM, not a reply sent from their own inbox, so it's
--    only as accurate as the habit of updating status. No backfill: there
--    is no honest record of when existing leads were first contacted.

alter table business add column collect_lead_source boolean not null default false;

alter table leads add column lead_source text;
alter table leads add column lead_source_detail text;
alter table leads add column first_contacted_at timestamptz;

create or replace function set_lead_first_contacted_at()
returns trigger
language plpgsql
as $$
begin
  if new.first_contacted_at is null and new.status is distinct from 'new' then
    -- On INSERT this covers a lead added straight into the CRM as
    -- already-contacted (dashboards exclude manually added leads from
    -- response-time math anyway). On UPDATE it's the first move out of 'new'.
    if tg_op = 'INSERT' or old.status = 'new' then
      new.first_contacted_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger leads_first_contacted_at
  before insert or update on leads
  for each row execute function set_lead_first_contacted_at();
