-- Ethical review program: the review-growth half of "Get Chosen" in the
-- Full Caseload System. See admin/review-program.astro and the public
-- /share-your-experience page.
--
-- Built around the ACA Code of Ethics C.3.b limit: counselors "do not
-- solicit [testimonials] from current clients, former clients, or any
-- other persons who may be vulnerable to undue influence." So nothing
-- here ever asks a client for a review directly. The only channel is a
-- passive waiting-room sign whose QR code leads to an information page
-- (optional, privacy considerations, we don't respond to reviews) before
-- the Google link.
--
-- 1. google_review_url: the practice's own Google Business Profile
--    "ask for reviews" link. Null means the public page shows no link.
-- 2. review_snapshots: a manual monthly log of the practice's Google
--    review count and rating, so review growth shows on the dashboard
--    without the Business Profile API (access still pending).

alter table business add column google_review_url text;

create table review_snapshots (
  id uuid primary key default gen_random_uuid(),
  recorded_on date not null default current_date,
  review_count integer not null check (review_count >= 0),
  average_rating numeric(2, 1) check (average_rating between 1 and 5),
  created_at timestamptz not null default now()
);

alter table review_snapshots enable row level security;

create policy "admin can read review snapshots" on review_snapshots
  for select using (is_owner() or is_agency());
create policy "admin can insert review snapshots" on review_snapshots
  for insert with check (is_owner() or is_agency());
create policy "admin can delete review snapshots" on review_snapshots
  for delete using (is_owner() or is_agency());
