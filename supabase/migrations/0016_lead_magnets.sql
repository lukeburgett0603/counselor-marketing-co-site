-- Lead Magnets: a gated-content-download widget an owner/agency can
-- assign to one page at a time (name "Lead Magnet" deliberately distinct
-- from the existing LeadGenerator.astro component, which is the site's
-- plain contact-request form — see CLAUDE.md's Admin CMS section). A
-- visitor trades name+email for a file download; the resulting lead lands
-- in the same `leads` table the existing dashboard already reads, tagged
-- with which magnet it came from.

create table lead_magnets (
  id uuid primary key default gen_random_uuid(),
  -- One magnet per page — the public template has exactly one fixed slot
  -- for this widget (between the mid-page CTA and the bottom contact
  -- form), so two magnets on the same page would be ambiguous about
  -- which one renders.
  page_id uuid not null references pages(id) on delete cascade unique,
  title text not null,
  description text not null,
  file_url text not null,
  file_name text not null,
  image_url text,
  image_alt text,
  -- Mirrors ImageSlot's shape (src/lib/pages.ts) for Unsplash-sourced
  -- images — required for their API's attribution guidelines, same as
  -- every other Unsplash-sourced image slot in this app.
  image_credit_name text,
  image_credit_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger lead_magnets_set_updated_at
  before update on lead_magnets
  for each row execute function set_updated_at();

alter table lead_magnets enable row level security;

-- Public read: the static build fetches this at build time (same as
-- pages/business) to render the widget, and the public form submission
-- flow reads it too.
create policy "public can read lead magnets" on lead_magnets
  for select using (true);

create policy "admin can insert lead magnets" on lead_magnets
  for insert with check (is_owner() or is_agency());
create policy "admin can update lead magnets" on lead_magnets
  for update using (is_owner() or is_agency()) with check (is_owner() or is_agency());
create policy "admin can delete lead magnets" on lead_magnets
  for delete using (is_owner() or is_agency());

-- Ties a captured lead back to which magnet produced it (nullable — a
-- normal LeadGenerator.astro contact-form submission leaves this null).
-- `set null` on delete, not cascade: removing a magnet later shouldn't
-- erase the historical leads it already generated.
alter table leads add column lead_magnet_id uuid references lead_magnets(id) on delete set null;

-- Storage for the actual downloadable file. Public, same reasoning as
-- site-images (0015): this app has no signed-URL delivery mechanism, and
-- a random-UUID-prefixed path is a proportionate, simple way to keep a
-- marketing PDF from being trivially guessable without building real
-- access-gating infrastructure for what isn't sensitive data.
insert into storage.buckets (id, name, public)
values ('lead-magnet-files', 'lead-magnet-files', true)
on conflict (id) do nothing;

create policy "admin can upload lead magnet files" on storage.objects
  for insert with check (bucket_id = 'lead-magnet-files' and (is_owner() or is_agency()));
