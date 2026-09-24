-- Real-time "someone just submitted the contact form" email, sent to
-- whichever team member should see it first — deliberately a plain
-- business-level setting, not hardcoded into the submit-lead Edge
-- Function (see this project's own standing rule against hardcoding one
-- client's identity into shared code). Null means no notification is
-- sent — same "unset means skip it" pattern as cloudflare_beacon_token/
-- google_fonts_url. No admin UI yet — set once directly, matching how
-- every other business-level flag in this file started (add a toggle
-- only if a real client needs to change it themselves).
alter table business add column lead_notification_email text;
