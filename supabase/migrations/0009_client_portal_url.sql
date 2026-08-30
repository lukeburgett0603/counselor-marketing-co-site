-- A link to the business's EHR client portal (e.g. SimplePractice,
-- TherapyNotes) for existing clients — surfaced as a "Client Portal" link
-- in the footer (Footer.astro), next to Admin Login, only when set. Not
-- relevant to every business (Counselor Marketing Co.'s own site has no
-- therapy clients of its own) — this exists for the counseling-practice
-- client sites built from this template, which do.
alter table business add column client_portal_url text;
