import type { APIRoute } from 'astro';
import { withBase } from '../lib/url';

// Generated (rather than a static public/robots.txt) so the sitemap URL
// always matches whatever domain this client repo's astro.config.mjs
// `site` is set to — one less per-client file to remember to edit.
// `site` alone (Astro.site) omits the GitHub Pages project-path `base`
// (e.g. '/repo-name'), same gotcha withBase() exists to solve elsewhere —
// without it this produces a Sitemap: line that 404s on a project path.
export const GET: APIRoute = ({ site }) => {
  const siteUrl = new URL(withBase('/'), site).toString().replace(/\/$/, '');
  return new Response(`User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${siteUrl}/sitemap-index.xml\n`, {
    headers: { 'Content-Type': 'text/plain' },
  });
};
