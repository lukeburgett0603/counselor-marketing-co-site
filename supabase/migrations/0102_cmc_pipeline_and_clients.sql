-- CMC only (never synced to the template).
--
-- Sales pipeline: each prospect (lead) can carry the plan being discussed
-- and its monthly value, so Inquiries can total what's in the pipeline.
-- Plans match CMC's pricing (src/lib/site.ts TIERS).
alter table public.leads
  add column deal_plan text check (deal_plan in ('self-guided', 'done-for-you', 'group', 'other')),
  add column deal_value integer check (deal_value >= 0);

-- Clients and revenue: the client directory becomes CMC's client list.
-- Monthly revenue = monthly_price + the monthly add-ons, for active clients.
alter table public.client_sites
  add column plan text check (plan in ('self-guided', 'done-for-you', 'group', 'other')),
  add column monthly_price integer check (monthly_price >= 0),
  add column addons text[] not null default '{}',
  add column start_date date,
  add column status text not null default 'active' check (status in ('active', 'paused', 'ended'));
