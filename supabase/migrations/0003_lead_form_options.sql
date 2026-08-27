-- Per-business (not per-client-hardcoded-in-code) lead-form configuration.
-- Every business's LeadGenerator reads these two columns via the `business`
-- row already in scope on every template — defaults keep the form exactly
-- as before for any business that doesn't opt in.
alter table business add column collect_website_in_leads boolean not null default false;
alter table business add column lead_response_time_note text;

-- Only collected when collect_website_in_leads is true; always optional on
-- the visitor's side even when the field is shown (some prospects have no
-- site yet).
alter table leads add column existing_website_url text;
