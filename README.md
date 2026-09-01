# Local Business Site Template

Astro + Tailwind static site template for local-business client sites.
Content (business profile, page copy, JSON-LD-feeding fields) lives in a
per-client Supabase project and is fetched **at build time**, so Google gets
fully-rendered static HTML while you still get to edit content without
touching code.

This repo is the template used by `site-structure-planner-supabase`,
`webpage-copywriter`, and `frontend-site-builder-supabase` — see those
skills for how a new client site actually gets planned and filled in. This
README covers the mechanical setup for one client — every step here is a
manual, easy-to-forget action outside the app's own code, so treat this as
a checklist to run in full, not a reference to skim.

## One-time setup per new client

1. **Create the client repo from this template** — this repo is a GitHub
   template repository (`is_template: true`), so:
   `gh repo create <client-repo-name> --public --template=lukeburgett0603/local-business-site-template`
   (or click "Use this template" on GitHub). This gives the new repo a clean
   history of its own rather than inheriting this template's commits — don't
   fall back to manually copying files unless `gh`/GitHub template creation
   is genuinely unavailable. Keep it **public** so GitHub Pages hosting
   stays free (a private repo needs a paid GitHub plan for Pages).

2. **Create a Supabase project** for this client (same Supabase account,
   new project). Run every file in `supabase/migrations/` against it, **in
   filename order** — either `supabase db push` (Supabase CLI) or pasting
   each file into the Supabase Studio SQL editor one at a time. There are
   many of these now (schema, RLS, admin roles, Storage) — running only
   `0001_init.sql` and stopping is a real, previously-made mistake; the
   admin dashboard and image uploads silently don't work without the rest.

3. **Add repo secrets** (Settings → Secrets and variables → Actions):
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
     (both from Supabase Project Settings → API — the anon/public key,
     never the service_role key)
   - `PUBLIC_UNSPLASH_APP_NAME` — required by Unsplash's API attribution
     guidelines for any photo sourced through their API (see
     `OptimizedImage.astro`). One Unsplash *application* is reused across
     every client site built from this template, so this is the same
     value in every client repo's secrets, not a per-client name. Falls
     back to a generic value if left unset, so a first deploy won't
     outright fail without it — but set it for real attribution to be
     correct.

4. **Enable GitHub Pages** (Settings → Pages) with source set to
   **GitHub Actions** (not "Deploy from a branch").

5. **Set the domain and base path** (`astro.config.mjs`):
   - **Custom domain already set up**: set `site` to that domain, leave
     `base` as `'/'`, add a `public/CNAME` file containing the domain, and
     add the DNS record GitHub Pages specifies (an A record for an apex
     domain, or a CNAME record for a subdomain) — whoever manages that
     client's DNS adds it.
   - **No custom domain yet**: the site is only reachable at
     `https://<github-username>.github.io/<repo-name>/` — set `site` to
     `https://<github-username>.github.io` and `base` to `/<repo-name>`
     instead, so every internal link (all routed through `src/lib/url.ts`'s
     `withBase()`) resolves correctly under that path. **Forgetting this
     step is the single most common way a first deploy looks broken** —
     the homepage can render perfectly while every other page and asset
     404s, since only the homepage works at the bare domain root. Click
     through every nav link after a first deploy, not just the homepage.
     Update both fields again, back to the custom-domain values, whenever
     a domain gets added later.

6. **Deploy the `publish-site` Edge Function** — this is what makes
   Publish/Save buttons in the admin dashboard actually rebuild the live
   site, and what powers Team invites. Skipping this step means the admin
   dashboard mostly *looks* like it works (saves to Supabase succeed) but
   nothing ever goes live and nobody can be invited.
   ```bash
   supabase functions deploy publish-site --project-ref <ref>
   supabase secrets set GITHUB_TOKEN=<fine-grained PAT> --project-ref <ref>
   supabase secrets set GITHUB_REPO=<github-username>/<repo-name> --project-ref <ref>
   ```
   `GITHUB_TOKEN` must be a fine-grained PAT scoped to **only this client's
   repo**, with Actions: Read and write and nothing broader — generate one
   at github.com/settings/tokens. `GITHUB_WORKFLOW_FILE` is optional,
   defaults to `deploy.yml`.

   **Optional**: also deploy `search-unsplash` and set
   `UNSPLASH_ACCESS_KEY` (same key already used for local/offline image
   sourcing, see "Handling the Unsplash API key" in the
   `frontend-site-builder-supabase` reference doc) if this client should
   have live Unsplash search in the Lead Magnets admin screen. Without
   it, that screen's search button just shows a "not configured" message
   and direct image upload still works.
   ```bash
   supabase functions deploy search-unsplash --project-ref <ref>
   supabase secrets set UNSPLASH_ACCESS_KEY=<key> --project-ref <ref>
   ```

7. **Seed the first admin login** — a brand-new project has zero rows in
   `admin_users`, so nobody can log in through the normal invite flow yet
   (there's no existing owner to send the invite). Insert the agency's own
   row directly, using the service_role key as an ephemeral shell
   variable, never committed anywhere:
   ```bash
   curl -X POST "https://<ref>.supabase.co/rest/v1/admin_users" \
     -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"id":"<agency-auth-user-id>","email":"<agency-email>","role":"agency","status":"active"}'
   ```
   This needs a real Supabase Auth user to already exist for that email on
   this project first (`POST /auth/v1/admin/users`, or have the agency
   account activate via the invite flow once one owner exists) — the row
   above just grants that Auth user admin access. Once this row exists,
   everything else (inviting the client as `owner`, inviting `staff`) can
   go through the normal Team screen.

8. **Set `business.content_permission_level`** to match the plan this
   client actually bought (`'restricted'` — the schema default — or
   `'full'`) — see CLAUDE.md's Admin CMS section for what each tier means.
   No UI for this on purpose (a client's own `owner` login must never be
   able to upgrade their own plan for free) — set it directly via SQL or
   Supabase Studio's table editor.

9. Push to `main`. The `deploy.yml` workflow builds and publishes
   automatically. After any later Supabase content edit made *outside* the
   admin dashboard (e.g. directly in Studio), re-run the workflow manually
   (Actions tab → this workflow → "Run workflow") to republish — editing
   Supabase alone does not update the live site. Content edits made
   *through* the admin dashboard already trigger this automatically.

**Recommended, not required for a first deploy**: configure custom SMTP
(Resend, Postmark, etc.) in this project's Supabase Auth settings.
Supabase's default shared email service has a low send-rate limit (a
handful of emails/hour) — fine while only one or two people ever log in,
but it will start throwing "email rate limit exceeded" the moment a client
invites a small team in one sitting. Worth doing before that client
actually needs to invite multiple staff, not after they hit the error.

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

## The admin dashboard (`/admin/*`)

Three roles: `owner` (the client's own business owner, full access to their
site subject to their `content_permission_level` tier), `staff` (blog posts
only, and only their own), `agency` (your own super-admin access, seeded in
step 7 above — exempt from the content-permission lock, sees the
Suggestions review screen). See CLAUDE.md's Admin CMS section for the full
architecture.
