-- Schema for one client site's Supabase project.
-- Mirrors the Wix Headless "Business" and "Pages" collections from the
-- original skills, adapted to Postgres. Each client gets their own Supabase
-- project running this same migration, so this file is the shared contract
-- between site-structure-planner-supabase, webpage-copywriter, and
-- frontend-site-builder-supabase.

create extension if not exists "pgcrypto";

-- Keeps updated_at current on any row update.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- business: one row per project. Canonical business entity referenced by
-- every page's schema.org JSON-LD via @id, per schema-markup.md.
-- ---------------------------------------------------------------------------
create table business (
  id uuid primary key default gen_random_uuid(),
  business_subtype text not null,        -- schema.org LocalBusiness subtype, e.g. 'Plumber', 'ProfessionalService'
  display_name text not null,            -- name used in nav/branding
  legal_name text,
  logo_url text,
  brand_colors text[] not null default '{}',
  brand_fonts text[] not null default '{}',
  design_inspiration_urls text[] not null default '{}',
  brand_assets_status text not null default 'not-provided'
    check (brand_assets_status in ('provided', 'not-provided')),
  founding_year int,
  price_range text,
  telephone text,
  email text,
  street_address text,
  address_locality text,
  address_region text,
  postal_code text,
  latitude numeric,
  longitude numeric,
  opening_hours jsonb,                   -- e.g. [{"day":"Monday","opens":"08:00","closes":"17:00"}, ...]
  same_as text[] not null default '{}',  -- Google Business Profile, Facebook, Instagram, etc.
  photos text[] not null default '{}',   -- real business photos (storefront, team, work) for LocalBusiness `image`
  google_maps_url text,                  -- feeds LocalBusiness `hasMap` and the tap-to-directions link in Footer
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger business_set_updated_at
  before update on business
  for each row execute function set_updated_at();

-- Enforce a single business row per project (one site = one business entity).
create unique index business_singleton on business ((true));

-- ---------------------------------------------------------------------------
-- pages: one row per planned page. Matches site-structure-planner's Wix
-- "Pages" collection field-for-field, with copy stored as markdown instead
-- of Ricos rich content.
-- ---------------------------------------------------------------------------
create table pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  page_type text not null check (page_type in (
    'Homepage', 'About', 'Services Overview', 'Service Page',
    'Content Pillar', 'Counselor Profile', 'Service Area', 'Contact', 'Other'
  )),
  purpose text,                           -- internal planning note only, never rendered to visitors
                                           -- (hero_subhead added in 0002_add_hero_subhead.sql)
  nav_placement text not null default 'none'
    check (nav_placement in ('primary', 'footer', 'utility', 'none')),
  nav_order int not null default 0,
  parent_page_id uuid references pages(id) on delete set null,
  internal_links text[] not null default '{}',  -- slugs of related pages
  status text not null default 'placeholder'
    check (status in ('placeholder', 'in-progress', 'content-complete')),
  h1 text,
  meta_title text,
  meta_description text,
  focus_keyword text,
  copy text,                              -- markdown, written by webpage-copywriter
  credentials text,                       -- Counselor Profile only
  author_name text,                       -- Content Pillar only
  date_published date,                    -- Content Pillar only
  date_modified date,                     -- Content Pillar only
  area_served_name text,                  -- Service Page / Service Area only
  images jsonb not null default '{}',     -- {"hero": {"url": "...", "alt": "..."}, ...}
  cta_heading text,                       -- the page's actual StoryBrand Call-to-Action line, pulled from
                                           -- brandscript/brief during Content Sync — never a generic filler
                                           -- string invented by the frontend
  cta_button_text text,
  testimonial_quote text,                 -- optional, only ever a genuine client-supplied quote (never invented,
  testimonial_author text,                -- and never turned into Review/AggregateRating JSON-LD per
  testimonial_role text,                  -- schema-markup.md's self-serving-review rule — display only)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pages_parent_page_id_idx on pages (parent_page_id);
create index pages_nav_placement_idx on pages (nav_placement, nav_order);

create trigger pages_set_updated_at
  before update on pages
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- leads: contact-form submissions, inserted directly from the browser via
-- the anon key (see RLS policy below) so no server function is needed.
-- ---------------------------------------------------------------------------
create table leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  email text,
  phone text,
  message text,
  source_page text,     -- slug of the page the form was submitted from
  status text not null default 'new' check (status in ('new', 'contacted', 'closed'))
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table business enable row level security;
alter table pages enable row level security;
alter table leads enable row level security;

-- Public read access: the Astro build fetches business/pages content at
-- build time using the anon key. This data is going to be rendered on a
-- public website regardless, so public SELECT is not a privacy concern.
create policy "public can read business" on business
  for select using (true);

create policy "public can read pages" on pages
  for select using (true);

-- Anyone can submit the contact form, but nobody can read leads back except
-- an authenticated user (the client, once a login-gated /leads dashboard is
-- built) or you via the Supabase dashboard service role.
create policy "public can insert leads" on leads
  for insert with check (true);

create policy "authenticated can read leads" on leads
  for select using (auth.role() = 'authenticated');
