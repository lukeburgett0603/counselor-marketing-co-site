// Stops builds re-downloading Supabase Storage images. Astro's image tool
// fetches the original for every <Image> that uses inferSize, so a build
// asked for one 2 MB headshot 44 times (126 MB per deploy, measured
// 2026-11-06; 72 deploys a month used up Supabase's free 5 GB of cached
// egress). This serves each storage file once per build from memory and,
// across builds, from .cache/remote-images, which the deploy workflow
// saves between runs. Uploads get new timestamped names; to refresh a file
// replaced in place, delete .cache/remote-images (or bump the key in
// deploy.yml).
//
// Plain .mjs so astro.config.mjs can import it before the build starts.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(process.cwd(), '.cache', 'remote-images');
const isStorageGet = (url, init) => /\/storage\/v1\/object\/public\//.test(url) && (init?.method ?? 'GET') === 'GET';

export function installRemoteImageCache() {
  if (globalThis.__remoteImageCache) return;
  globalThis.__remoteImageCache = true;
  mkdirSync(DIR, { recursive: true });
  const memory = new Map();
  const stats = { downloaded: 0, reused: 0 };
  const realFetch = globalThis.fetch;

  const load = async (url) => {
    const file = join(DIR, createHash('sha256').update(url).digest('hex'));
    if (existsSync(file)) {
      const meta = JSON.parse(readFileSync(`${file}.json`, 'utf8'));
      return { bytes: readFileSync(file), type: meta.type };
    }
    const res = await realFetch(url);
    if (!res.ok) return { failed: res };
    const bytes = Buffer.from(await res.arrayBuffer());
    const type = res.headers.get('content-type') ?? 'application/octet-stream';
    writeFileSync(file, bytes);
    writeFileSync(`${file}.json`, JSON.stringify({ url, type }));
    stats.downloaded += 1;
    return { bytes, type };
  };

  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input?.url ?? String(input));
    if (!isStorageGet(url, init)) return realFetch(input, init);
    if (memory.has(url)) stats.reused += 1;
    else memory.set(url, load(url));
    const hit = await memory.get(url);
    if (hit.failed) {
      memory.delete(url);
      return hit.failed.clone();
    }
    const res = new Response(hit.bytes, { status: 200, headers: { 'content-type': hit.type, 'content-length': String(hit.bytes.length) } });
    // Astro checks the final URL against image.remotePatterns; a Response
    // built here has none unless it's set.
    Object.defineProperty(res, 'url', { value: url });
    return res;
  };

  process.on('exit', () => {
    if (stats.downloaded + stats.reused) console.log(`[remote-images] ${stats.downloaded} downloaded, ${stats.reused} repeat requests saved`);
  });
}
