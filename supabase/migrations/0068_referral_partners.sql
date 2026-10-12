-- Referral partner tracker: the "Get Referred" step of the Full Caseload
-- System. Tracks the local professionals and organizations a practice is
-- building referral relationships with (doctors' offices, attorneys,
-- churches, schools...), every outreach touch, and which leads and
-- clients each partner actually sent.
--
-- Same access model as the rest of lead management: owner/agency only
-- (admin/referral-partners.astro). Activities are append-only, matching
-- lead_notes' call-log model (0017_lead_crm.sql).

create table referral_partners (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  category text not null default 'other' check (category in (
    'physician', 'pediatrician', 'mental_health', 'attorney', 'church',
    'school', 'employer', 'other_professional', 'other'
  )),
  contact_name text,
  email text,
  phone text,
  website text,
  address text,
  -- prospect -> contacted -> meeting -> active; inactive = paused/ended.
  status text not null default 'prospect' check (status in ('prospect', 'contacted', 'meeting', 'active', 'inactive')),
  next_follow_up date,
  notes text,
  archived_at timestamptz
);

create table referral_partner_activities (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references referral_partners(id) on delete cascade,
  activity_type text not null default 'note' check (activity_type in (
    'email', 'call', 'visit', 'meeting', 'materials', 'thank_you', 'note'
  )),
  occurred_on date not null default current_date,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table leads add column referral_partner_id uuid references referral_partners(id) on delete set null;

alter table referral_partners enable row level security;
alter table referral_partner_activities enable row level security;

create policy "admin can read referral partners" on referral_partners
  for select using (is_owner() or is_agency());
create policy "admin can insert referral partners" on referral_partners
  for insert with check (is_owner() or is_agency());
create policy "admin can update referral partners" on referral_partners
  for update using (is_owner() or is_agency()) with check (is_owner() or is_agency());
create policy "admin can delete referral partners" on referral_partners
  for delete using (is_owner() or is_agency());

create policy "admin can read partner activities" on referral_partner_activities
  for select using (is_owner() or is_agency());
create policy "admin can insert partner activities" on referral_partner_activities
  for insert with check (is_owner() or is_agency());

-- Auto-link a new lead to a tracked partner when the visitor's "Who
-- referred you?" answer exactly matches a partner's name (case- and
-- whitespace-insensitive). Deliberately exact, not fuzzy: a wrong
-- automatic credit is worse than none, and staff can always link it by
-- hand in the Lead CRM. SECURITY DEFINER because the contact form's
-- insert runs as a role that can't read referral_partners.
create or replace function link_lead_to_referral_partner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.referral_partner_id is null and nullif(trim(new.lead_source_detail), '') is not null then
    select id into new.referral_partner_id
    from referral_partners
    where lower(trim(name)) = lower(trim(new.lead_source_detail))
      and archived_at is null
    limit 1;
  end if;
  return new;
end;
$$;

create trigger leads_link_referral_partner
  before insert on leads
  for each row execute function link_lead_to_referral_partner();
