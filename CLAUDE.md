# Local Business Site Template — Project Memory

This is the **template repo** — the shared source for every client site
built with `site-structure-planner-supabase`, `webpage-copywriter`, and
`frontend-site-builder-supabase`. Each client gets its own repo created
from this one (`gh repo create --template=...`, see README.md) plus its own
Supabase project. This file exists so the standards and hard-won fixes
below carry into every future client build, not just the first one
(Counselor Marketing Co.) they were learned on.

**Working discipline**: generic, reusable work happens here. Anything
specific to one client (their actual copy, their palette, their business
facts) happens in that client's own repo, never here. When a fix belongs in
both (a real bug, not a client preference), fix it here first, then sync
outward — never patch a client repo and forget to bring the fix back.

## Non-negotiable standards for every client build

These aren't aspirational — they're the direct output of an actual design
+ SEO + schema audit pass done on the first real client site. Treat all of
these as "done" criteria, not nice-to-haves, for every future client.

### Content depth & keywords

- Hit the word-count range for the page's `page_type` — see
  `webpage-copywriter/references/page-types.md`. Don't pad to hit a number
  and don't skip the range to save time.
- Use the page's `focus_keyword` naturally — exact-match phrase 2-7 times
  in normal-length copy, bolded on first use, plus natural variants
  throughout. **Never chase a fixed repetition count on a long keyword
  phrase** — a 4+ word phrase repeated 6-10 times verbatim in ~600-900
  words reads as spam and risks a Google helpful-content penalty. See
  `webpage-copywriter/references/keyword-usage-rules.md` — it's explicit
  about this.
- Contact pages, legal/utility pages, and any placeholder/stub page (no
  real content yet) are **not** keyword-optimization targets. Keyword-
  stuffing a Privacy Policy or a Contact page isn't good SEO practice.
- A `Content Pillar` page type that's actually a single-client case study
  (not a genuine broad-topic-cluster piece) doesn't need to hit the full
  1,800-3,500 word pillar range — right-size it with real, specific detail
  instead of padding toward a word count with content that isn't there yet
  (e.g. don't invent traffic/ranking numbers that don't exist).

### Schema markup

- Every page gets JSON-LD via `buildPageSchemas()` (`src/lib/schema.ts`) —
  this is already wired through `BaseLayout.astro`, don't hand-write
  JSON-LD inline in a template.
- **Before calling any client build done**: validate real pages through
  both [Google's Rich Results
  Test](https://search.google.com/test/rich-results) and the [Schema.org
  Validator](https://validator.schema.org/) — not just eyeballing the
  generated JSON. Rich Results Test only surfaces types currently eligible
  for a visual search result (Breadcrumbs, etc.) — a clean 0-errors/
  0-warnings result on the Schema.org Validator is what actually confirms
  `Service`/`Organization`/`FAQPage`/etc. are structurally valid.
- **`FAQPage` schema**: only from genuine, visible Q&A already on the page.
  The pattern is `pages.faqs` (`[{question, answer}]`) → `FAQ.astro` (a
  real `<details>/<summary>` accordion) → `buildFAQSchema()`, appended
  whenever `faqs` is non-empty, independent of `page_type`. Never invent
  questions just to get the schema type on a page — see
  `frontend-site-builder-supabase/references/schema-markup.md` rule 6.
- **`Organization`/`LocalBusiness` should have `logo` and `same_as` set**
  when the business has them. If there's no real logo file yet and the
  brand is wordmark-only (text, no icon mark), generate one from the real
  CSS wordmark rather than leaving `logo` empty or inventing a new mark —
  see "Generating a logo from a CSS wordmark" below.
- **Never** generate `Review`/`AggregateRating` schema from a site's own
  `testimonial_quote`/`testimonial_author` columns — that's a Google
  structured-data policy violation, even though the testimonial itself is
  fine to render visibly.

### Images

- `ImageSlot.alt` is a required field at the type level, but that only
  catches a *missing* alt, not a lazy one (`"photo"`, `"headshot"`). Every
  image needs a real, specific description of what's actually in the
  frame — see `frontend-site-builder-supabase/references/
  supabase-technical-setup.md` for the standard and an example.
- Work the page's focus keyword into at least one image's alt text when it
  fits naturally (per `keyword-usage-rules.md`'s placement checklist) —
  never force it, never at the cost of accuracy.

### Conversion / CTA discipline

- The Hero's CTA button is above the fold — don't remove it or push the
  page's only call-to-action to the bottom.
- **Never let two CTAs compete with mismatched copy on the same view.**
  `Hero.astro`'s `showAside` pattern (suppresses its own CTA button
  whenever a form already occupies the `aside` slot) and
  `LeadGenerator`'s `submitText` prop (so a form's submit button matches
  its heading instead of a generic "Send") both exist specifically to
  prevent this — reuse them, don't reintroduce the mismatch on a future
  client's homepage.
- CTA heading/button text comes from `page.cta_heading`/`cta_button_text`,
  never hardcoded — see `page-templates.md`.
- **A hover-revealed nav dropdown's trigger word is also a real link, but
  most visitors never discover that.** `Header.astro`'s dropdown always
  prepends an explicit, visually set-apart link back to the parent page
  itself as the dropdown's first item — don't remove this trying to
  "declutter" a dropdown; it's the fix for a real, reported point of
  confusion (a "Resources" nav item whose own destination — the blog
  index — was undiscoverable except by clicking the trigger word itself,
  which a hover-dropdown UI hides).

## Real bugs found and fixed here — don't reintroduce these

These were all genuinely live and broken at some point on the first real
client build, several of them past a first "looks done" pass. Read this
before touching the related code on a future client site.

- **`import.meta.env.BASE_URL` doesn't reliably carry a trailing slash.**
  `withBase()` (`src/lib/url.ts`) handles this correctly — strip and
  re-add the slash explicitly. Assuming either way broke every
  non-homepage link on first deploy once. Any new helper that builds a
  URL from `BASE_URL` or `Astro.site` needs the same care — this bit
  `CTA.astro`'s default href and `robots.txt.ts`'s `Sitemap:` line
  separately, months apart, before both were fixed.
- **`page.purpose` is internal planning metadata — it must never reach
  anything public.** It has held things like exact pricing tiers
  (`"$800/mo tier for solo private-practice clinicians"`). This leaked
  into public output **three separate times** on the first client build:
  the Hero subhead, Services Overview card blurbs, and — found during a
  later schema audit — the `Service`/`Person` JSON-LD `description` field
  and a `BaseLayout` meta-description fallback. All fixed by using
  `meta_description` instead, with no fallback to `purpose`. If you're
  adding a new place that needs page-level descriptive text, reach for
  `meta_description`, never `purpose`, as the reflex.
- **Any component that can render more than once per page must use class
  selectors, not `id`.** `LeadGenerator` originally used
  `id="lead-form"`; a second instance (e.g. a compact form embedded in a
  Hero alongside the full form further down) would have silently failed
  to submit, since `getElementById` only wires up the first match. Fixed
  with `.lead-form`/`querySelectorAll`. Check this before giving any new
  component an `id` at all.
- **The `anon` Supabase key has read-only access to `pages` and
  `business`.** A PATCH with the anon key returns `204` (looks
  successful) but silently updates zero rows — there's no RLS UPDATE
  policy for `anon` on either table, by design (see `0001_init.sql`).
  Any content write needs the **service_role key**
  (`supabase projects api-keys --project-ref <ref>`), used only as an
  ephemeral env var in the shell, **never** committed to a repo file or
  written into a script that gets saved.
- **A Supabase content edit does not rebuild the live site.** Content is
  fetched at build time only — after any Supabase edit, trigger a rebuild
  via `gh workflow run "Build and deploy to GitHub Pages" --ref main`
  (the workflow already has `workflow_dispatch` wired up for this).
- **A GitHub Pages deploy can fail by retrying the identical commit SHA**
  — looks like a stuck/timed-out deployment, but is actually
  `deployment_cancelled`. A fresh (even empty) commit fixes it.
- **`@supabase/supabase-js` needs Node ≥22** for native WebSocket support
  to construct its client at all, even though this template never uses
  realtime features. Both the GitHub Actions workflow and local dev need
  Node 22+ (`package.json`'s `engines` field documents this; local dev via
  nvm: `nvm install 22 && nvm use 22`).
- **A `node -e "..."` script's env vars must be set *before* the
  command** (`VAR=x node -e ...`), not after — passed after, they're
  silently treated as script arguments instead of environment variables.
- **PostgREST refuses an unscoped UPDATE** ("UPDATE requires a WHERE
  clause") — always filter by `id` or `slug` on any PATCH.
- **The StoryBrand Plan and any genuine Q&A content are structured data,
  not prose.** `PlanSteps.astro` (`pages.plan_steps`) and `FAQ.astro`
  (`pages.faqs`) both exist so this content gets real visual separation
  instead of being buried in a numbered list or bolded-question
  paragraphs inside `copy`. When either gets written into `copy` instead
  (or in addition), pull it out into the structured column and remove it
  from `copy` so it isn't rendered twice.
- **Never hardcode one client's identity into shared template code.**
  `OptimizedImage.astro`'s Unsplash attribution link had a specific
  client's business slug hardcoded into the `utm_source` UTM parameter —
  every future client site would have silently inherited the wrong
  attribution. Fixed by reading `PUBLIC_UNSPLASH_APP_NAME` instead (falls
  back to a generic name if unset) — this identifies the *Unsplash
  Application* registered on unsplash.com/oauth/applications, not the
  client, and is meant to be the same value across every client site that
  shares one Unsplash API app. If a UTM value, an API app name, or any
  other identifier needs a slug (no spaces/apostrophes), derive one rather
  than passing user-supplied text straight into a query string.
- **A new `PUBLIC_*` env var isn't wired up just because a component reads
  it and `.env.example` documents it.** It also has to be explicitly
  passed through in `.github/workflows/deploy.yml`'s `npm run build`
  step's `env:` block — `PUBLIC_UNSPLASH_APP_NAME` was defined and
  documented for a while before anyone noticed the workflow never actually
  passed it to the build, so setting the GitHub secret alone would have
  done nothing. Check the workflow file, not just `.env.example`, when
  adding any new build-time env var.

## Client dashboard (`/leads` login)

Business decision (2026-08-29): client sites are **rented/managed, not
sold outright** — the agency keeps the repo/Supabase/hosting and the
client pays ongoing, with an explicit buyout/export clause offered to
offset lock-in objections. A dashboard that proves the ongoing work is
working, without the agency having to manually compile a report, is a
direct extension of that model — every client site should have one.

**Built (tier 1 — real, no new infrastructure)**: `leads.astro` computes a
dashboard client-side from the same `leads` fetch the table below it
already does — total leads, this-month vs. last-month with a trend
indicator, a 10-week volume bar chart, and a leads-by-page breakdown. No
new table, no new query, no charting library (plain CSS bars). Reuse this
pattern (compute from data already being fetched, render with CSS, no new
dependency) for any future addition to this dashboard.

**Also built**: the client can mark a lead contacted/closed directly from
the dashboard (a color-coded `<select>` per row, `.status-select` +
event delegation on the table body). This needed a new RLS policy —
`0001_init.sql` only ever granted `authenticated` **read** on `leads`,
never update, so a naive "just add a select and call `.update()`" would
have silently failed under RLS. See `0006_leads_status_update.sql`. If
you add any other write action to this dashboard later, check for an RLS
policy covering it before assuming the client-side call will work — this
project has hit "the query looks right but RLS silently blocks it" more
than once (see the real-bugs list above on `anon` having no write access
to `pages`/`business` either).

**Verification pattern worth reusing**: to test dashboard changes with
real (not fake-looking) data, seed temporary leads and a **throwaway
Supabase Auth user** via the Admin API
(`POST /auth/v1/admin/users` with the service_role key) rather than
touching the client's real login — then delete both the test leads and
the temp user afterward. Never leave test data in a client's live
`leads` table, and never log in as the client to test something.

**Planned, not yet built — add when there's a reason to (a second client,
or a client asking for more):**

- **Tier 2 — traffic (visitors, pageviews, top pages).** Needs an
  analytics tool wired in (the site currently has none) — something
  lightweight and privacy-respecting like Plausible or Cloudflare Web
  Analytics, not GA4's weight/complexity for a small local-business site.
  Pairs with lead volume to tell the real story: top-of-funnel traffic
  next to bottom-of-funnel conversions.
- **Tier 3 — search rankings/impressions (Google Search Console data).**
  The most convincing "your SEO is working" evidence, but the most work:
  needs Search Console API access per client (OAuth/service account), and
  a scheduled job to snapshot data (can't be queried live from the browser
  without exposing credentials — Search Console data itself also lags a
  few days). Treat as a premium-tier differentiator, not a v1 expectation.

## Hub-and-spoke content (Content Pillar + Blog Post + Blog Index)

Built 2026-08-29, first shipped on Counselor Marketing Co. — see
`page-templates.md`'s "Hub-and-spoke content" section for the technical
spec (that's the source of truth; this section is the reasoning and the
process worth reusing).

**Service Pages are never part of this system.** The original ask on the
first real client build was to embed a filtered blog preview directly on
Service Pages, styled as if they were content pillars. Talked through why
that's the wrong shape before building it: Service Pages are short,
CTA-heavy conversion pages, and merging genuine informational-pillar
intent onto the same page dilutes both jobs — the conversion page gets
noisier, and the "pillar" content is trapped on a page that was never
built to rank broadly for informational search. **Dedicated hub pages**
(reusing `Content Pillar` — its original spec always meant long-form,
topic-cluster content) solve this cleanly instead, linked from their own
nav dropdown, with Service Pages left untouched.

**Category taxonomy must come from real keyword research, not a guessed
list.** Categories seeded to match the service list 1:1 seems obvious at
first but is the wrong default — it assumes every genuinely valuable blog
topic maps onto exactly one existing service, which real keyword research
consistently disproves (the strongest cluster found for Counselor
Marketing Co., faith-based counseling, doesn't map to any single service
page). Do real keyword research (Mangools API — `GET
https://api.mangools.com/v3/kwfinder/related-keywords?kw=<seed>&location_id=2840&language_id=1000`
with the key in an `x-access-token` header) around informational-intent
seed terms adjacent to the business's actual services, then group
genuine, on-topic, correctly-intent-matched results into categories.
Expect to manually filter out a lot of noise (brand names, adjacent
professions, "near me" hyper-local queries meant for a different
audience than the blog's) — raw keyword tool output is not ready-to-use
data.

**Watch for search-intent mismatches when a raw volume number looks
exciting.** A high-volume keyword cluster can be *end-client* search
volume (someone looking for a therapist for themselves) rather than
*counselor*-facing search volume (someone looking for marketing help) —
the two have completely different audiences and a blog aimed at
counselors can't target the first kind directly, no matter how large the
number is. Surface this distinction explicitly rather than presenting a
combined volume number that implies it's all directly targetable — it
isn't, and the client will (rightly) ask for the breakdown if the number
seems too good to be true.

**Verification pattern**: same as the leads dashboard — build the full
mechanism (pill filtering, `?category=` pre-selection, hub↔post
cross-linking), then verify it against **temporary test posts** seeded
directly in Supabase, not the absence of testing just because there's no
real content yet. Delete the test posts after. This caught real, working
behavior with confidence before any real content existed to obscure bugs
in either direction.

## Generating a logo from a CSS wordmark

If a client's brand is wordmark-only (explicitly no pictorial icon mark)
and there's no design tool available, this worked well and is worth
reusing rather than leaving `business.logo_url` empty:

1. Build a standalone HTML file reproducing the exact wordmark CSS (real
   font via Google Fonts `@import`, same weight/color/tracking as the
   live site) on the brand's neutral background color.
2. Serve it locally (`python3 -m http.server`) — a `file://` preview
   sandboxes out external font requests, so it won't render the real
   font.
3. Rasterize with headless Chrome: `"/Applications/Google Chrome.app/
   Contents/MacOS/Google Chrome" --headless=new --window-size=512,512
   --screenshot=logo.png <url>` — a square PNG comfortably clears
   Google's 112×112 minimum and square-aspect recommendation for the
   Logo structured data feature.
4. Upload to the same Supabase Storage bucket as other client images, set
   `business.logo_url` to its public URL. No code change needed —
   `buildBusinessSchema()` already includes `logo` conditionally.
5. Check `BaseLayout.astro`'s `ogImage` fallback — it already falls back
   to `business.logo_url` when a page has no hero image, so this also
   fixes any Open Graph preview gap on imageless pages (e.g. a homepage
   whose hero is a lead form instead of a photo).

## Where the detailed rules live

This file is a standards checklist and a "don't regress this" list, not
the procedure itself. For the actual how-to:

- `site-structure-planner-supabase` — site structure, page planning,
  brandscript elicitation.
- `webpage-copywriter` — StoryBrand copywriting, word-count ranges,
  keyword usage rules (shared with the Wix pipeline — storage-agnostic).
- `frontend-site-builder-supabase` — technical build: Supabase setup,
  schema markup, page templates, image handling, deploy.

README.md covers one-time mechanical setup for a new client (repo
creation, Supabase project, secrets, Pages config) — this file doesn't
repeat that.
