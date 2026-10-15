// GitHub Pages serves a repo without a custom domain at
// `username.github.io/repo-name/`, not at the root — so every internal
// link needs the configured `base` prefix (astro.config.mjs) or it 404s.
// Once a client has a custom domain, `base` stays '/' and this is a no-op.
//
// import.meta.env.BASE_URL reflects the `base` config value exactly as
// written — it does NOT reliably carry a trailing slash (a base of
// '/repo-name' with no trailing slash yields BASE_URL '/repo-name', not
// '/repo-name/'). Never assume either way; strip and re-add the slash
// explicitly so this is correct regardless of how `base` was written.
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const [, pathPart, suffix] = path.match(/^([^?#]*)(.*)$/)!;
  const clean = pathPart.replace(/^\//, '');
  return clean ? `${base}/${withTrailingSlash(clean)}${suffix}` : `${base}/${suffix}`;
}

// Pages are served as folders (`slug/index.html`), and GitHub Pages
// redirects `/slug` to `/slug/`. So every page address ends in a slash
// (astro.config.mjs `trailingSlash: 'always'`): canonical tags, the
// sitemap, schema and internal links all name the address the server
// actually serves, with no redirect in between. Files (anything whose
// last segment has a dot: .xml, .ico, .woff2) never get one.
// Fixed 2026-10-14: the site said "never" while the server added the
// slash, so canonical X redirected to Y, which pointed back to X.
export function withTrailingSlash(path: string): string {
  const [, pathPart, suffix] = path.match(/^([^?#]*)(.*)$/)!;
  if (!pathPart || pathPart.endsWith('/')) return path;
  const last = pathPart.split('/').pop() ?? '';
  return last.includes('.') ? path : `${pathPart}/${suffix}`;
}

// Absolute URL of a page, for canonical tags and structured data.
export function pageUrl(siteUrl: string, slug: string | null | undefined): string {
  return slug ? `${siteUrl}/${withTrailingSlash(slug)}` : `${siteUrl}/`;
}
