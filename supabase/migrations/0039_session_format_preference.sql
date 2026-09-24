-- "Preferred Session Format" (In-Person / Telehealth) on the lead form —
-- opt-in per business, same pattern as collect_counselor_preference and
-- collect_website_in_leads: a client with no telehealth offering at all
-- just doesn't set this, and the radio group never renders.
alter table business add column collect_session_format_preference boolean not null default false;

-- Plain nullable text, not an enum type — matches the rest of this
-- table's style (status, source_page are all plain text too) and keeps a
-- future third option (e.g. "either") a one-line admin/UI change, not a
-- migration. 'in_person' | 'telehealth' | null (no preference stated).
alter table leads add column preferred_session_format text;
