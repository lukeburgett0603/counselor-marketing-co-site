-- Hub-and-spoke content model: dedicated informational hub pages (reusing
-- 'Content Pillar' — its original spec was always long-form, topic-cluster
-- content; the Case Study is the one existing page that doesn't quite fit
-- that mold, left alone here) are the pillars, 'Blog Post' rows are the
-- spokes, and a new 'Blog Index' page type renders the filterable /blog
-- listing (replacing the generic 'Other' template it used as a placeholder
-- before real posts existed). Service Pages are deliberately NOT part of
-- this system — they stay pure conversion pages; see CLAUDE.md's "Client
-- dashboard"-adjacent "Hub-and-spoke content" section for the reasoning.
alter table pages drop constraint pages_page_type_check;
alter table pages add constraint pages_page_type_check check (page_type in (
  'Homepage', 'About', 'Services Overview', 'Service Page',
  'Content Pillar', 'Counselor Profile', 'Service Area', 'Contact', 'Other',
  'Blog Post', 'Blog Index'
));

-- Free-text taxonomy, independent of the service list — on a 'Blog Post'
-- row this is the post's own topic; on a 'Content Pillar' hub row it names
-- which category feeds that page's embedded "related articles" section
-- (BlogPreview.astro). Null means "no spoke content configured" — never
-- invent a category to force a section to render. Real categories should
-- come from actual keyword research (see CLAUDE.md), not be guessed.
alter table pages add column category text;
