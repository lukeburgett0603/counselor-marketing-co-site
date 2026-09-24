-- Cloudflare Turnstile (bot-defense widget) site key — public, client-side,
-- same trust level as cloudflare_beacon_token/google_fonts_url, not a
-- secret. Null means Turnstile is off for this client; the matching
-- CLOUDFLARE_TURNSTILE_SECRET_KEY Edge Function secret (set only when a
-- client opts in) is what actually verifies a submission server-side in
-- submit-lead — this column alone only controls whether the client-side
-- widget renders.
alter table business add column cloudflare_turnstile_site_key text;
