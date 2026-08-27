// GitHub Pages serves a repo without a custom domain at
// `username.github.io/repo-name/`, not at the root — so every internal
// link needs the configured `base` prefix (astro.config.mjs) or it 404s.
// Once a client has a custom domain, `base` stays '/' and this is a no-op.
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL; // always has a trailing slash
  const clean = path.replace(/^\//, '');
  return clean ? `${base}${clean}` : base;
}
