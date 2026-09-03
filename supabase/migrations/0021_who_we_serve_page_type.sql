-- Adds 'Who We Serve' as a page_type: a light-tier overview page (same
-- shape as Services Overview) whose grid pulls every Service Page with
-- service_group = 'segment' — Solo Practice, Group Practice, Psychologist,
-- and Christian Counseling Marketing. These are audience/practice-type
-- pages, not deliverables, and were previously mixed into the Services
-- dropdown/overview grid alongside the real services (Website Design, SEO,
-- Google Ads, Full-Service) — genuinely confusing what's actually being
-- sold vs. who it's built for. See CLAUDE.md's Services Overview section.
alter table pages drop constraint pages_page_type_check;
alter table pages add constraint pages_page_type_check check (page_type in (
  'Homepage', 'About', 'Services Overview', 'Service Page',
  'Content Pillar', 'Counselor Profile', 'Service Area', 'Contact', 'Other',
  'Blog Post', 'Blog Index', 'Who We Serve'
));
