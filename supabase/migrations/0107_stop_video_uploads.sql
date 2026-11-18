-- CMC copy of the template's 0080 (usage audit, 2026-11-18): no more direct video uploads. A video file in
-- Supabase Storage streams through the project's egress allowance every
-- time a visitor presses play (a 50 MB video watched 100 times is the
-- free plan's whole month). Videos are YouTube/Vimeo links only; the
-- admin's upload button is gone (page-copy.astro) and this closes the
-- server side too. The bucket stays (empty on every site at the time) so
-- "Your data" exports and old links don't break, but nobody can add to
-- it and it no longer serves files publicly.
drop policy if exists "authenticated can upload site videos" on storage.objects;
update storage.buckets set public = false where id = 'site-videos';
