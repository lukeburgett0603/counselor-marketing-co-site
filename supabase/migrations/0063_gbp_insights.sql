-- Tier 4 of the admin Leads and analytics dashboard: Google Business
-- Profile Performance data (map/search impressions, website clicks, call
-- clicks, direction requests). See CLAUDE.md's "Client dashboard" section
-- ("Tier 4 — Google Business Profile") for the full design reasoning.
--
-- Same shape as Tier 2 (Cloudflare traffic): read live from Google's API
-- on every dashboard load via a new Edge Function (get-gbp-insights), not
-- snapshotted into a table — the Business Profile Performance API already
-- retains historical daily data itself, so there's nothing to gain from
-- storing our own copy (unlike keyword_rank_snapshots, which exists
-- because Mangools' SerpWatcher only exposes a "current" position, not a
-- queryable history).
--
-- Only one new column is needed. Everything else this feature needs is a
-- secret, per this project's established rule that a real credential
-- never lives in a database column even when it's client-specific — see
-- CLAUDE.md's "SEO Insights dashboard" and "Client dashboard" (Tier 2)
-- sections for the same call made about the Mangools/Cloudflare API
-- tokens. Unlike those two, this credential is a per-client OAuth refresh
-- token (each client's own Google Business Profile access), not a shared
-- CMC-account key — see the Edge Function's own header comment for the
-- full config list (GOOGLE_BUSINESS_CLIENT_ID/_CLIENT_SECRET/
-- _REFRESH_TOKEN, all Supabase Edge Function secrets).
alter table business add column google_business_location_id text;

comment on column business.google_business_location_id is
  'Google Business Profile location resource id (the numeric id in "locations/{id}"), needed as the target of every Performance API call. Set once via direct SQL during onboarding, same "no admin UI, agency-only" category as mangools_location_id — see CLAUDE.md.';
