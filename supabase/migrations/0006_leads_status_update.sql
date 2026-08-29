-- The leads dashboard (src/pages/leads.astro) lets a logged-in client mark
-- a lead as contacted/closed, but 0001_init.sql only ever granted
-- authenticated users SELECT on leads, not UPDATE — without this, every
-- status change in the dashboard would silently fail under RLS. Same trust
-- boundary as the existing read policy: any authenticated user is the
-- client's own login (there's no multi-user/role distinction on this
-- table), so this isn't scoped any tighter than that.
create policy "authenticated can update leads" on leads
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
