import type { APIRoute } from 'astro';

// Generated (rather than a static public/robots.txt) so the sitemap URL
// always matches whatever domain this client repo's astro.config.mjs
// `site` is set to — one less per-client file to remember to edit.
export const GET: APIRoute = ({ site }) => {
  const sitemapUrl = new URL('sitemap-index.xml', site).toString();
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl}\n`, {
    headers: { 'Content-Type': 'text/plain' },
  });
};
