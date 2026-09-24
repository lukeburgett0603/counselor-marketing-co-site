-- "public can insert leads" (0001_init.sql) let ANY caller holding the
-- anon key insert directly into `leads` via `POST /rest/v1/leads` —
-- necessary back when LeadGenerator.astro's own submit handler wrote
-- straight to that endpoint, but that path was replaced by the submit-lead
-- Edge Function (see CLAUDE.md's "Real-time lead notification email"
-- section), which needs a server-side step (the notification email) after
-- every insert. submit-lead writes via the service_role client, which
-- bypasses RLS entirely — so this permissive policy has been dead weight
-- for the contact-form path ever since submit-lead shipped, and a live
-- exploit path for every other purpose: it also completely bypassed
-- submit-lead's honeypot and Turnstile spam checks (see "Contact-form
-- spam defense"), since either one could simply be skipped by calling
-- this REST endpoint directly instead of the Edge Function — confirmed
-- live, not assumed, while investigating a HIPAA-related security
-- question.
--
-- Two real callers still legitimately need to INSERT into `leads`
-- through PostgREST directly (not through submit-lead), so this can't
-- simply become admin-only:
--   1. The admin CRM's "+ Add lead" feature (admin/crm.astro) — a real,
--      logged-in owner/agency session.
--   2. LeadMagnet.astro's gated-download form — still on the old direct
--      REST path deliberately (see CLAUDE.md's "Contact-form spam
--      defense" section: lead-magnet downloads are a distinct, lower-
--      intent, lower-cost-of-spam signal than a real appointment
--      request, and were left out of this pass' scope).
-- The two are told apart by `lead_magnet_id`: LeadMagnet.astro always
-- sets it (see its own submit handler); a real contact-form submission
-- (through submit-lead) never does. Splitting the old single permissive
-- policy into two narrower ones closes the anon contact-form bypass
-- while leaving both real callers working exactly as before.
drop policy if exists "public can insert leads" on leads;

create policy "admin can insert leads"
  on leads for insert
  with check (is_owner() or is_agency());

create policy "public can insert lead magnet downloads"
  on leads for insert
  with check (lead_magnet_id is not null);
