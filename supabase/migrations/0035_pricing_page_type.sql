-- A new "Pricing" page_type for a real, transparent tier-comparison page
-- (SaaS-style: Website Build one-time, Solo Practice Growth Platform,
-- Group Practice Growth Platform), part of the 2026-09-20 repositioning
-- from "marketing agency" to "growth platform" — see brandscript-master.md
-- and Site Structure.md (both in the parent folder) for the full context.
--
-- **CMC-repo-only, deliberately not synced to local-business-site-template.**
-- A public, SaaS-style pricing page is a need specific to CMC's own site
-- right now, not a proven-generic client-site feature — client sites
-- (a therapist's own practice website) don't typically need a public tier
-- comparison the way an agency selling its own tiered platform does.
-- Promote this to the template later if a real client build needs the
-- same pattern, following this repo's own "build it there first once
-- proven generic" discipline (see CLAUDE.md's Tier 3/4 client-dashboard
-- entries for the same call made about SEO Insights/GBP Insights).
alter table pages drop constraint pages_page_type_check;
alter table pages add constraint pages_page_type_check check (page_type in (
  'Homepage', 'About', 'Services Overview', 'Service Page',
  'Content Pillar', 'Counselor Profile', 'Service Area', 'Contact', 'Other',
  'Blog Post', 'Blog Index', 'Who We Serve', 'Service Areas Overview',
  'Service Hub', 'Counselors Overview', 'Pricing'
));

-- Structured tier data, same "structured content gets a real column, not
-- a paragraph in `copy`" discipline as plan_steps/faqs/concerns. Only
-- meaningful on page_type = 'Pricing'; every other page type just carries
-- an empty array, same as concerns/plan_steps on a page that doesn't use
-- them.
alter table pages add column pricing_tiers jsonb not null default '[]';

comment on column pages.pricing_tiers is
  'Array of {name, price, price_note, best_for, features: string[], cta_text, highlighted: boolean}. Rendered by PricingTable.astro on Pricing pages only.';
