-- Numbered 0015, not 0014: the Counselor Marketing Co. client repo has
-- its own client-only 0014_client_directory.sql (not synced from this
-- template — see CLAUDE.md), so this skips 0014 in the template's own
-- sequence to avoid two different migrations both claiming that number
-- in any client repo that already has that one.
--
-- The blog post and website-content admin screens upload hero images
-- directly to a 'site-images' Storage bucket — 0010_blog_post_crud.sql's
-- "authenticated can upload site images" policy on storage.objects is
-- scoped to it — but nothing ever created the bucket itself. It had to
-- be created manually via Supabase Studio for every client site so far,
-- an easy-to-forget onboarding step (same class of gap as the Site URL
-- bug — a manual step with no code tracking whether it happened).
-- `on conflict do nothing` makes this safe to re-run.
--
-- Must be public: `getPublicUrl()` (used everywhere this bucket is read)
-- constructs a URL that only resolves for a public bucket — a private
-- bucket would need signed URLs instead, which the app doesn't use.
insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', true)
on conflict (id) do nothing;
