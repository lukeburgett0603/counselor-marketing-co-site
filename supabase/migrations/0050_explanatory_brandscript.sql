-- The rebuilt Homepage's "Explanatory Paragraph" section is a genuinely
-- separate, freestanding BrandScript — not one of the 5 storybrand_*
-- beats (those cover Stakes/Guide/Value Proposition/Success/Failure as
-- short, scannable copy). This is the long-form, multi-paragraph "paste
-- the whole brandscript in" text a visitor opts into via "Continue
-- reading," plus the H2 one-liner and short teaser shown before it's
-- expanded, and an optional video URL. Only meaningful on a 'Homepage'
-- row. See CLAUDE.md's "Homepage StoryBrand rebuild" section.
alter table pages add column brandscript_one_liner text;
alter table pages add column brandscript_teaser text;
alter table pages add column brandscript_full text;
alter table pages add column brandscript_video_url text;
