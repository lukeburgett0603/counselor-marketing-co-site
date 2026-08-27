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
  const clean = path.replace(/^\//, '');
  return clean ? `${base}/${clean}` : `${base}/`;
}
