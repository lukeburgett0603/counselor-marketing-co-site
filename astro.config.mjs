import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

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
  base: '/counselor-marketing-co-site',
  trailingSlash: 'never',
  integrations: [
    sitemap({
      // /admin/* is the internal, auth-gated admin area — never
      // public/indexable pages.
      filter: (page) => !page.includes('/admin'),
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
