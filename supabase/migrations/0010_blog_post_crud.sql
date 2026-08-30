-- Lets a logged-in admin create/edit/delete Blog Post rows from the new
-- /admin/blog dashboard, without opening this up to other page_types —
-- Website content editing (Phase 4) gets its own, more carefully scoped
-- policies later; this only ever touches rows that already are (or are
-- becoming) a 'Blog Post'.
create policy "authenticated can insert blog posts" on pages
  for insert with check (auth.role() = 'authenticated' and page_type = 'Blog Post');

create policy "authenticated can update blog posts" on pages
  for update using (auth.role() = 'authenticated' and page_type = 'Blog Post')
  with check (page_type = 'Blog Post');

create policy "authenticated can delete blog posts" on pages
  for delete using (auth.role() = 'authenticated' and page_type = 'Blog Post');

-- Lets the same dashboard upload a hero image for a new post directly to
-- Storage, instead of routing every image through the agency. Each client
-- has their own Supabase project, so this bucket is already isolated per
-- client — no cross-client exposure risk from opening this up.
create policy "authenticated can upload site images" on storage.objects
  for insert with check (bucket_id = 'site-images' and auth.role() = 'authenticated');
