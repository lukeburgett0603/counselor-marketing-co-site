-- Template migration 0065_page_cta_clicks.sql, renumbered 00655 for CMC:
-- CMC's own 0065 is its testimonials table. 00655 sorts between 0065 and 0066.

-- Real, per-page CTA click tracking — one half of the new blog-post
-- performance screen (see CLAUDE.md's "Blog analytics" section), the
-- other half being pageviews (Cloudflare Web Analytics) and leads
-- generated (already-collected via leads.source_page). A click on
-- CTA.astro's own button is a genuine "engaged but didn't convert"
-- signal distinct from an actual lead — LeadMagnet.astro needed no
-- equivalent tracking, since its own conversion is already fully
-- captured as a real `leads` row via `lead_magnet_id`.
--
-- Append-only telemetry, same shape as lead_notes — no update/delete
-- policy, since nothing here should ever be edited after the fact.
-- Public insert (`with check (true)`), same as the original `leads`
-- table pattern, since this fires from an anonymous visitor's own
-- browser with no session — a spammed click only inflates a count, it
-- can never expose or corrupt anything, so this doesn't need the
-- honeypot/Turnstile defenses `leads` needed once it became a real
-- target.
create table page_cta_clicks (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references pages(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index page_cta_clicks_page_id_idx on page_cta_clicks(page_id);

alter table page_cta_clicks enable row level security;

create policy "public can insert cta clicks" on page_cta_clicks
  for insert with check (true);
create policy "owner and agency can view cta clicks" on page_cta_clicks
  for select using (is_owner() or is_agency());
