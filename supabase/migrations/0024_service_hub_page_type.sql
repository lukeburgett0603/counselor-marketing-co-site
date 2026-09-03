-- A distinct 'Service Hub' page_type: a real, bookable service page that
-- also functions as a content hub/pillar for the blog — table of
-- contents, deep FAQ, plan steps, and category-driven spoke posts, all in
-- one page rather than split across a thin Service Page and a separate
-- Content Pillar. Deliberately kept distinct from 'Content Pillar' rather
-- than reusing it, even though the underlying mechanics
-- (TOC/FAQ/category/byline) are identical — the CMS should make "this is
-- also a real bookable service" explicit, not leave it implicit. Content
-- Pillar stays for pages that are genuinely just broad educational
-- content, never a service you can book directly (e.g. CMC's own
-- Therapist Branding, SEO & Marketing pillars).
--
-- First built for Freedom Counseling Services, whose 8 real services
-- (Individual, Couples & Marriage, Family, Child & Teen, Christian/
-- Faith-Based, Grief, Anxiety & Depression, Trauma & EMDR) are each
-- simultaneously a bookable service and a genuine topic people research
-- extensively — collapsing them into one substantial page, rather than a
-- thin conversion page plus a separate deep pillar, matches how their own
-- prior site already worked. Standard for future counseling-practice
-- clients whose services have the same dual nature — not every client
-- needs this (CMC's own marketing services are narrow/transactional, the
-- opposite case, and stay plain Service Pages).
alter table pages drop constraint pages_page_type_check;
alter table pages add constraint pages_page_type_check check (page_type in (
  'Homepage', 'About', 'Services Overview', 'Service Page',
  'Content Pillar', 'Counselor Profile', 'Service Area', 'Contact', 'Other',
  'Blog Post', 'Blog Index', 'Who We Serve', 'Service Areas Overview',
  'Service Hub'
));
