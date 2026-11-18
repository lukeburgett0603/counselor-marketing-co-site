// Launch gate (usage audit, 2026-11-18): run after `npm run build`.
// Fails if any public page in dist/ would make a visitor, crawler or link
// preview download from Supabase Storage (an <img>, share image, schema
// image or video pointing at /storage/v1/object/public/). Those count
// against the Supabase egress allowance on every fetch; the site should
// serve its own copies from dist/_astro instead (lib/shareImages.ts,
// <Image>/<OptimizedImage>). Links to downloadable files (a lead magnet
// PDF) are allowed: they're fetched only when someone asks for them.
//
//   npm run build && npm run check:usage
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = join(process.cwd(), 'dist');
const STORAGE = /https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/[^"'\s)&<]+/gi;
const MEDIA = /\.(jpe?g|png|webp|gif|avif|svg|mp4|mov|webm)$/i;

function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'admin') continue; // signed-in screens, not public pages
      yield* htmlFiles(p);
    } else if (name.endsWith('.html')) yield p;
  }
}

const found = new Map();
for (const file of htmlFiles(DIST)) {
  for (const url of readFileSync(file, 'utf8').match(STORAGE) ?? []) {
    if (!MEDIA.test(url.split('?')[0])) continue;
    if (!found.has(url)) found.set(url, []);
    found.get(url).push(file.slice(DIST.length + 1));
  }
}

if (found.size === 0) {
  console.log('Supabase usage check passed: no public page loads media from Supabase Storage.');
} else {
  console.error(`Supabase usage check FAILED: ${found.size} Storage file(s) referenced by public pages:`);
  for (const [url, files] of found) console.error(`  ${url}\n    on ${files.slice(0, 3).join(', ')}${files.length > 3 ? ` and ${files.length - 3} more` : ''}`);
  console.error('Serve them from the build instead (see "Supabase usage" in CLAUDE.md).');
  process.exit(1);
}
