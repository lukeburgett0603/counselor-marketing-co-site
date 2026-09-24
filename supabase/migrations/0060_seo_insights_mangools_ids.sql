-- Correction to 0059's Mangools ID modeling, found via real API-docs
-- research (apidocs.mangools.com) right after 0059 shipped, before any
-- real target keyword had a real Mangools id entered: a SerpWatcher
-- "tracking" is not one-per-keyword the way 0059 assumed. One tracking
-- covers a client's whole domain+location and holds many tracked
-- keywords inside it — the real per-keyword object is a "tracked
-- keyword," identified by its own id within that one shared tracking.
-- This also means rank-checking every target keyword only needs ONE
-- Mangools API call per client per week (POST /serpwatcher/trackings/
-- {tracking_id}/stats returns every tracked keyword's stats at once),
-- not one call per keyword as 0059's Edge Function originally did — a
-- real, meaningful quota-cost improvement on top of just being the
-- correct data model. See CLAUDE.md's "SEO Insights dashboard" section.

alter table target_keywords rename column mangools_tracking_id to mangools_tracked_keyword_id;

-- The one shared SerpWatcher tracking for this client's domain+location
-- — created once during onboarding via a real Claude+Mangools-MCP
-- session, same "set once, no admin UI, agency-only" category as
-- mangools_location_id/seo_competitor_domains.
alter table business add column mangools_tracking_id text;

-- The client's own bare domain, needed as the "domain" parameter on
-- Mangools' keyword-gap-analysis call (compare against
-- seo_competitor_domains) — didn't exist anywhere on business before
-- this, since nothing else in this app previously needed the site's own
-- domain as a plain string value (astro.config.mjs's site config isn't
-- reachable from a server-side Edge Function).
alter table business add column website_domain text;
