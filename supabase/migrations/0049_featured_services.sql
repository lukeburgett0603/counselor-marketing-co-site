-- Drives the new Homepage "Featured Services" section — the same
-- self-maintaining-grid discipline as service_group (0020_service_page_
-- groups.sql) rather than a manually-curated list on the Homepage row
-- itself, which is exactly the kind of thing that goes stale (see
-- CLAUDE.md's real-bugs list: Services Overview's own original
-- internal_links-driven grid silently missed a new Service Page once).
--
-- Only meaningful on a 'Service Page' or 'Service Hub' row. The
-- frontend filters featured_on_homepage, sorts by
-- homepage_feature_order, and slices to 3 — flagging more than 3 rows
-- is harmless (the extras just don't show), so no DB-level cap is
-- enforced here.
alter table pages add column featured_on_homepage boolean not null default false;
alter table pages add column homepage_feature_order integer;
