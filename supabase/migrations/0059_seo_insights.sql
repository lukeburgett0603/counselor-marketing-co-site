-- SEO Insights dashboard: a curated, agency-managed target-keyword list
-- per client, weekly rank history against it, and weekly competitor
-- keyword-gap results — the Mangools-backed version of the "Tier 3 —
-- search rankings" dashboard tier CLAUDE.md already anticipated. See
-- CLAUDE.md's "SEO Insights dashboard" section for the full design
-- reasoning (why weekly not daily, why the list lives here and not in
-- Mangools, why the owner has zero edit access).

-- target_keywords: the system of record for what CMC is targeting for
-- this client. Mangools is only ever the research tool used to populate
-- this — never the source of truth itself.
create table target_keywords (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  -- Snapshotted once at curation time (KWFinder search volume for a
  -- given phrase barely moves week to week), not re-pulled by the
  -- weekly cron — re-checking it on a schedule would burn quota for
  -- data that's effectively static.
  search_volume integer,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  -- 'paused' is a real, deliberate cost lever: the weekly cron skips
  -- paused keywords entirely (see refresh-seo-rankings), so pausing a
  -- keyword actually reduces this client's share of the shared Mangools
  -- quota, not just hides it from the dashboard. 'achieved' keywords are
  -- still checked (worth watching for regression), just visually
  -- distinguished on the dashboard.
  status text not null default 'active' check (status in ('active', 'paused', 'achieved')),
  notes text,
  -- Set once a real Mangools SerpWatcher tracking exists for this
  -- keyword — created manually during a real Claude+Mangools-MCP
  -- curation session (see CLAUDE.md), never by this app calling
  -- Mangools live. Null means "curated but not yet tracked" — the
  -- weekly cron skips these rather than erroring on them.
  mangools_tracking_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A table-level `unique` constraint can only reference column names, not
-- an expression like lower(keyword) — this needs a real unique index
-- instead, which is what actually enforces case-insensitive uniqueness.
create unique index target_keywords_keyword_lower_idx on target_keywords (lower(keyword));

create trigger target_keywords_set_updated_at
  before update on target_keywords
  for each row execute function set_updated_at();

alter table target_keywords enable row level security;

create policy "owner and agency can view target keywords" on target_keywords
  for select using (is_owner() or is_agency());

-- No owner write policy exists at all, on purpose — the practice owner
-- has zero edit capability on this table, not just a UI that hides the
-- controls. Only the agency curates this list.
create policy "agency can insert target keywords" on target_keywords
  for insert with check (is_agency());
create policy "agency can update target keywords" on target_keywords
  for update using (is_agency()) with check (is_agency());
create policy "agency can delete target keywords" on target_keywords
  for delete using (is_agency());

-- keyword_rank_snapshots: append-only weekly SERP position history per
-- target keyword. Written only by refresh-seo-rankings via the
-- service_role key (bypasses RLS) — no client-writable policy exists
-- for any role, matching this project's other server-only-write tables.
create table keyword_rank_snapshots (
  id uuid primary key default gen_random_uuid(),
  target_keyword_id uuid not null references target_keywords(id) on delete cascade,
  checked_at timestamptz not null default now(),
  -- Null means Mangools didn't find this domain in its tracked range for
  -- this keyword that week — never defaulted to 0 or invented.
  position integer,
  ranking_url text
);

alter table keyword_rank_snapshots enable row level security;

create policy "owner and agency can view rank snapshots" on keyword_rank_snapshots
  for select using (is_owner() or is_agency());

-- keyword_gap_snapshots: weekly competitor keyword-gap results (real
-- keywords a real competitor ranks for that this client doesn't yet) —
-- same append-only, service_role-only-write shape as rank snapshots.
-- The dashboard reads the single most recent checked_at batch.
create table keyword_gap_snapshots (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  search_volume integer,
  competitor_domain text not null,
  checked_at timestamptz not null default now()
);

alter table keyword_gap_snapshots enable row level security;

create policy "owner and agency can view gap snapshots" on keyword_gap_snapshots
  for select using (is_owner() or is_agency());

-- Per-client Mangools config — set once during onboarding via direct
-- SQL, no admin UI, same category as cloudflare_beacon_token/
-- google_fonts_url. mangools_location_id resolves this client's real
-- service area to Mangools' own location id (via mangools_search_locations)
-- so SERP checks reflect local, not national, results.
alter table business add column mangools_location_id integer;
alter table business add column seo_competitor_domains text[] not null default '{}';
