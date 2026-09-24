-- A short paragraph shown between the CTA band's heading and its
-- button — same "ungated, safe on every tier" category as the existing
-- cta_heading/cta_button_text it sits alongside (not in
-- enforce_content_permission()'s tier-gated list). First real use: the
-- Homepage's closing CTA, once storybrand_failure stops rendering as
-- its own section — the "why it's worth acting now" reminder moves
-- into this subheading instead of a standalone Failure section.
alter table pages add column cta_subheading text;
