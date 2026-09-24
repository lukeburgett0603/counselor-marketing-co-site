-- The redesigned 3-column footer/"junk drawer" (Explore / Company /
-- Legal) needs each footer-placed page to declare which column it
-- belongs in — footer_column is only meaningful when
-- nav_placement = 'footer'. A fixed 3-value enum, not free text, so
-- Footer.astro can render a guaranteed, predictable 3-column layout
-- instead of an unbounded number of columns.
--
-- business.footer_cta_heading backs the new CTA band shown directly
-- above the footer on every page (the reference "junk drawer" design
-- pairs a CTA banner with the link columns) — null falls back to a
-- display_name-based default, same pattern as CTA.astro's own existing
-- heading fallback.
alter table pages add column footer_column text
  check (footer_column in ('explore', 'company', 'legal'));

alter table business add column footer_cta_heading text;

-- Backfill every page already placed in the footer on every existing
-- client project, so this rebuild doesn't silently blank out a real
-- site's footer nav the moment the template ships. Best-guess by
-- page_type/title — legal pages are unambiguous by type; the rest is a
-- reasonable default a client can freely re-categorize afterward via
-- the new admin control, not a permanent assignment.
update pages
set footer_column = case
  when page_type in ('Other') and title ilike '%privacy%' then 'legal'
  when page_type in ('Other') and title ilike '%terms%' then 'legal'
  when page_type in ('About', 'Contact', 'Service Area', 'Service Areas Overview') then 'company'
  else 'explore'
end
where nav_placement = 'footer';
