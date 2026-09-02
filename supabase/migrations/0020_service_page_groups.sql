-- Services Overview groups its Service Pages into two sections —
-- "what we do" (core deliverables: Website Design, SEO, Google Ads,
-- Full-Service) vs. "built for your practice" (segment/pricing-tier
-- pages: Solo, Group, Psychologist Marketing). Previously the grid was
-- driven by a manually-curated `internal_links` list on the Services
-- Overview page itself — real bug found in production: a new Service
-- Page (Google Ads for Therapists) never showed up because nobody
-- remembered to add its slug to that list. `service_group` fixes the
-- underlying class of bug, not just that one instance: the Services
-- Overview template now pulls every page with this set, dynamically —
-- a new Service Page with a `service_group` shows up automatically,
-- no page to remember to update.
alter table pages add column service_group text
  check (service_group in ('deliverable', 'segment'));
