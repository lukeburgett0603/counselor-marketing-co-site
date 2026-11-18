// Serves share images and structured-data images from the built site
// instead of Supabase Storage (usage audit, 2026-11-18). Crawlers and
// link previews (Google, Facebook, iMessage, LinkedIn, Slack) fetch
// og:image and the images named in JSON-LD on their own schedule. Pointed
// at Storage, each fetch counted against Supabase's egress allowance
// (Freedom's homepage share image was a 6 MB original). This swaps every
// Storage image URL for a resized copy (at most 1200px wide) written into
// dist/_astro and served by GitHub Pages. The original is downloaded once
// per build at most (remoteImageCache.mjs keeps it between builds).
import { getImage } from 'astro:assets';

const STORAGE_IMAGE = /^https:\/\/[^/]+\/storage\/v1\/object\/public\/[^?#]+\.(jpe?g|png|webp)(\?[^#]*)?$/i;
const done = new Map<string, Promise<string>>();

async function localize(url: string, siteUrl: string): Promise<string> {
  try {
    // Same format as the original (JPEG photos stay JPEG, a PNG logo keeps
    // its transparency, WebP stays WebP); never enlarged.
    const ext = (url.match(/\.(jpe?g|png|webp)(\?|$)/i)?.[1] ?? 'jpg').toLowerCase();
    const format = ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpg';
    const img = await getImage({ src: url, inferSize: true, width: 1200, format, quality: 82 });
    return new URL(img.src, `${siteUrl}/`).toString();
  } catch (err) {
    console.warn(`[share-images] kept the Storage URL for ${url}: ${(err as Error).message}`);
    return url;
  }
}

export function localImageUrl(url: string | null | undefined, siteUrl: string): Promise<string | undefined> {
  if (!url) return Promise.resolve(undefined);
  if (!STORAGE_IMAGE.test(url)) return Promise.resolve(url);
  if (!done.has(url)) done.set(url, localize(url, siteUrl));
  return done.get(url)!;
}

// Walks structured data and replaces every Storage image URL in it.
export async function localizeSchemaImages<T>(value: T, siteUrl: string): Promise<T> {
  if (typeof value === 'string') return ((await localImageUrl(value, siteUrl)) ?? value) as T;
  if (Array.isArray(value)) return (await Promise.all(value.map((v) => localizeSchemaImages(v, siteUrl)))) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = await localizeSchemaImages(v, siteUrl);
    return out as T;
  }
  return value;
}
