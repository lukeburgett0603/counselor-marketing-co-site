-- New Storage bucket for direct video file uploads (Explanatory
-- Paragraph's video field, Homepage and Counselor Profile both share
-- this via brandscript_video_url) — the first video, not image, media
-- this pipeline has handled, so the first migration to set
-- file_size_limit/allowed_mime_types on a bucket at all. 200MB is a
-- reasonable cap for a short brand/intro video without inviting
-- unbounded storage/bandwidth abuse — revisit if a real client needs a
-- longer video.
--
-- Public + permissive upload policy, matching site-images
-- (0015_site_images_bucket.sql/0010_blog_post_crud.sql) rather than
-- lead-magnet-files' owner/agency-only policy — a linked-counselor
-- session needs to upload their own video, and (same reasoning as every
-- other upload in this app) RLS on the `pages` columns themselves is the
-- real enforcement boundary, not the storage bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-videos',
  'site-videos',
  true,
  209715200,
  array['video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do nothing;

create policy "authenticated can upload site videos" on storage.objects
  for insert with check (bucket_id = 'site-videos' and auth.role() = 'authenticated');
