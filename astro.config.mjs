import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

const BASE = '/counselor-marketing-co-site';

// MDX page bodies link internally as "/pricing" (no base). This rehype
// step prefixes the base at build time, the same job withBase() does in
// .astro files, so a markdown link never 404s on the GitHub Pages path.
function rehypeBaseLinks() {
  const prefix = BASE.replace(/\/$/, '');
  const visit = (node) => {
    if (node.type === 'element' && node.tagName === 'a') {
      const href = node.properties?.href;
      if (typeof href === 'string' && href.startsWith('/') && !href.startsWith('//') && prefix && !href.startsWith(prefix + '/')) {
        node.properties.href = prefix + href;
      }
    }
    (node.children ?? []).forEach(visit);
  };
  return (tree) => visit(tree);
}

// 2026-09-30 rebuild: URLs that moved or merged (rebuild/site-architecture.md).
// Static builds emit a meta-refresh page with a canonical link to the new
// URL, the closest GitHub Pages gets to a 301.
const redirects = {
  '/full-service-marketing': '/how-it-works',
  '/branding': '/website-design',
  '/case-study-freedom-counseling': '/results/freedom-counseling-services',
  '/faith-based-counseling-marketing': '/christian-counseling-marketing',
  '/ethical-reviews': '/google-business-profile-for-therapists#ethical-reviews',
};

// `site` gets overwritten per client repo once a domain is known
// (site: 'https://clientdomain.com'). Needed for correct canonical URLs,
// the generated sitemap, and the schema.org @id base used throughout
// src/lib/schema.ts.
//
// `base`: GitHub Pages serves a repo without a custom domain at
// `username.github.io/repo-name/`, not the root. Until this client has a
// custom domain, set `site` to `https://<username>.github.io` and `base`
// to `/<repo-name>` — every internal link already goes through
// src/lib/url.ts's withBase() to pick this up automatically. Once a custom
// domain is added, set `site` to that domain and `base` back to '/'.
export default defineConfig({
  site: 'https://lukeburgett0603.github.io',
  base: BASE,
  trailingSlash: 'never',
  redirects: Object.fromEntries(Object.entries(redirects).map(([from, to]) => [from, BASE + to])),
  markdown: { rehypePlugins: [rehypeBaseLinks] },
  integrations: [
    mdx(),
    sitemap({
      // /admin/* is the internal, auth-gated admin area — never
      // public/indexable pages.
      filter: (page) => !page.includes('/admin') && !Object.keys(redirects).some((from) => page.endsWith(from)),
    }),
  ],
  image: {
    // Stock photos (Unsplash) and any client-hosted logo/photo URLs are
    // fetched and optimized by astro:assets at build time rather than
    // linked to directly — see src/components/OptimizedImage.astro.
    remotePatterns: [{ protocol: 'https' }],
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
