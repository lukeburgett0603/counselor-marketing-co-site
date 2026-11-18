// Every admin image upload goes through here (usage audit, 2026-11-18).
// Phones and stock sites hand over 2-6 MB originals; stored as-is they
// cost Supabase egress every time a build, an admin screen or a crawler
// fetches them. This shrinks a photo in the browser before it leaves:
// longest side at most 2000px (the site builds its own smaller sizes
// from it), WebP at 85% quality. A 6 MB photo becomes about 300 KB with no
// visible difference. SVGs and GIFs, files the browser can't decode
// (e.g. HEIC on Chrome), and files already smaller than the result go up
// unchanged. Uploads get a timestamped name, so they're also marked
// cacheable for a year.
import type { SupabaseClient } from '@supabase/supabase-js';

const MAX_SIDE = 2000;
const QUALITY = 0.85;
export const UPLOAD_CACHE_CONTROL = '31536000';

async function shrink(file: File): Promise<{ body: Blob; ext: string; type: string }> {
  const original = { body: file as Blob, ext: (file.name.split('.').pop() ?? 'bin').toLowerCase(), type: file.type };
  if (!/^image\/(jpeg|png|webp|avif|bmp|tiff)$/i.test(file.type)) return original;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const webp = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', QUALITY));
    // Safari before 17 can't encode WebP and silently returns PNG.
    if (!webp || webp.type !== 'image/webp') return original;
    if (scale === 1 && webp.size >= file.size) return original;
    return { body: webp, ext: 'webp', type: 'image/webp' };
  } catch {
    return original;
  }
}

/**
 * Shrinks (when it's a photo) and uploads an image to a public bucket.
 * `folder` is the path prefix, e.g. 'content' or 'blog'.
 */
export async function uploadImage(
  supabase: SupabaseClient,
  bucket: string,
  folder: string,
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  const { body, ext, type } = await shrink(file);
  const base = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-]/g, '_').slice(0, 80) || 'image';
  const path = `${folder}/${Date.now()}-${base}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType: type || undefined, cacheControl: UPLOAD_CACHE_CONTROL });
  if (error) return { url: null, error: error.message };
  return { url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl, error: null };
}
