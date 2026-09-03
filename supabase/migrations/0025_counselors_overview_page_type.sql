-- A fourth instance of the same dynamic-grid landing-page pattern as
-- Services Overview, Who We Serve, and Service Areas Overview — a "meet
-- the team" page for a group practice's Counselors nav dropdown, filtered
-- to page_type = 'Counselor Profile' directly (no grouping column
-- needed, same reasoning as Service Areas Overview: 'Counselor Profile'
-- is already an unambiguous type on its own). Only worth building for a
-- practice with more than one counselor — a solo practice just puts its
-- one bio on the About page, no overview needed. First built for Freedom
-- Counseling Services (5 counselors).
alter table pages drop constraint pages_page_type_check;
alter table pages add constraint pages_page_type_check check (page_type in (
  'Homepage', 'About', 'Services Overview', 'Service Page',
  'Content Pillar', 'Counselor Profile', 'Service Area', 'Contact', 'Other',
  'Blog Post', 'Blog Index', 'Who We Serve', 'Service Areas Overview',
  'Service Hub', 'Counselors Overview'
));
