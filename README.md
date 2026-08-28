# Local Business Site Template

Astro + Tailwind static site template for local-business client sites.
Content (business profile, page copy, JSON-LD-feeding fields) lives in a
per-client Supabase project and is fetched **at build time**, so Google gets
fully-rendered static HTML while you still get to edit content without
touching code.

This repo is the template used by `site-structure-planner-supabase`,
`webpage-copywriter`, and `frontend-site-builder-supabase` — see those
skills for how a new client site actually gets planned and filled in. This
README covers the mechanical setup for one client.

## One-time setup per new client

1. **Create the client repo from this template** — this repo is a GitHub
   template repository (`is_template: true`), so:
   `gh repo create <client-repo-name> --public --template=lukeburgett0603/local-business-site-template`
   (or click "Use this template" on GitHub). This gives the new repo a clean
   history of its own rather than inheriting this template's commits — don't
   fall back to manually copying files unless `gh`/GitHub template creation
   is genuinely unavailable. Keep it **public** so GitHub Pages hosting
   stays free.
2. **Create a Supabase project** for this client (same Supabase account,
   new project). Run `supabase/migrations/*.sql` against it, in order —
   either via `supabase db push` (Supabase CLI) or by pasting each file into
   the Supabase Studio SQL editor.
3. **Add repo secrets** (Settings → Secrets and variables → Actions):
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
   (from Supabase Project Settings → API — the anon/public key, never the
   service_role key.)
4. **Enable GitHub Pages** (Settings → Pages) with source set to
   **GitHub Actions** (not "Deploy from a branch").
5. **Custom domain** (if any): add a `public/CNAME` file containing the
   domain, and add the DNS record GitHub Pages specifies (an A record for an
   apex domain, or a CNAME record for a subdomain) — whoever manages that
   client's DNS adds it.
6. Push to `main`. The `deploy.yml` workflow builds and publishes
   automatically. After any later Supabase content edit, re-run the
   workflow manually (Actions tab → this workflow → "Run workflow") to
   republish — editing Supabase alone does not update the live site.

## Local development

Requires **Node 22.19+** (`@supabase/supabase-js` needs native WebSocket
support to construct its client at all, even though this project never
uses realtime features). Check with `node --version`; if you're on an
older Node via nvm, run `nvm install 22 && nvm use 22` first.

```bash
cp .env.example .env   # fill in this client's Supabase URL + anon key
npm install
npm run dev
```

## How content flows in

- `business` table (Supabase): one row, the canonical business entity used
  for JSON-LD schema on every page.
- `pages` table: one row per page. Only rows with `status = 'content-complete'`
  are rendered — a `placeholder` row is skipped rather than shown with
  invented content.
- `leads` table: contact-form submissions, inserted directly from the
  browser via the anon key (RLS restricts it to insert-only for anonymous
  visitors).

See `src/lib/pages.ts` for the query layer and `src/lib/schema.ts` for the
JSON-LD generation rules (ported from the Wix version's
`references/schema-markup.md` — same rules: never invent a schema property,
one canonical business `@id`, no self-serving review markup).
