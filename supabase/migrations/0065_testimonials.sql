-- Testimonial slots for the 2026-09-30 rebuild. A quote renders only when
-- a real, approved one exists; an empty table renders nothing anywhere
-- (never a placeholder). `slots` names where it may appear: 'home',
-- 'audit', 'results', 'pricing', 'services'.
create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null,
  author_name text not null,
  author_role text,
  practice_name text,
  slots text[] not null default '{}',
  approved boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table testimonials enable row level security;

drop policy if exists "public can read approved testimonials" on testimonials;
create policy "public can read approved testimonials" on testimonials
  for select using (approved = true or is_owner() or is_agency());

drop policy if exists "admin can manage testimonials" on testimonials;
create policy "admin can manage testimonials" on testimonials
  for all using (is_owner() or is_agency()) with check (is_owner() or is_agency());
