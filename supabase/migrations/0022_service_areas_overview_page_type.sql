-- A new page_type, 'Service Areas Overview' — the landing/hub page for a
-- business that serves more than one distinct geographic area (e.g. a
-- clinical practice with a physical office in one metro plus telehealth
-- coverage of a second region). Individual 'Service Area' pages already
-- existed as a page_type (0001_init.sql) but had no shared landing page or
-- nav grouping — a business with just one service area still doesn't need
-- this (a single Service Area page can sit directly in nav), but two or
-- more benefits from the same dynamic-grid pattern already used by
-- Services Overview and Who We Serve: the overview page pulls every
-- 'Service Area' page automatically, nothing to manually curate. See
-- CLAUDE.md's Services Overview & Who We Serve section — this is the same
-- pattern applied a third time, first requested for Freedom Counseling
-- Services (Louisville, KY + Southern Indiana).
alter table pages drop constraint pages_page_type_check;
alter table pages add constraint pages_page_type_check check (page_type in (
  'Homepage', 'About', 'Services Overview', 'Service Page',
  'Content Pillar', 'Counselor Profile', 'Service Area', 'Contact', 'Other',
  'Blog Post', 'Blog Index', 'Who We Serve', 'Service Areas Overview'
));
