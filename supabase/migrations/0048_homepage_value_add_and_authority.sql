-- Two new scannable, admin-editable lists for the rebuilt Homepage
-- structure — see CLAUDE.md's "Homepage StoryBrand rebuild" section.
--
-- value_add_items: the icon+label strip directly under the Hero (2-4
-- items, e.g. "Faith-Integrated Care" / "Licensed Experts"). Only
-- meaningful on a 'Homepage' row. `icon` is a key into the new
-- src/components/Icon.astro fixed icon set, not a free-text/URL value —
-- keeps the strip visually consistent across every client site instead
-- of admins pasting arbitrary icon URLs.
--
-- guide_authority_stats: short credibility facts shown in the new Guide
-- section (e.g. "Experience" / "15+ years", "Credentials" / "LPCA,
-- LCSW"). Also Homepage-only. Deliberately the same {label, value}[]
-- shape as plan_steps/faqs/concerns's {title, description}[] so the
-- admin UI can reuse createItemListEditor() without a new factory.
alter table pages add column value_add_items jsonb not null default '[]';
alter table pages add column guide_authority_stats jsonb not null default '[]';
