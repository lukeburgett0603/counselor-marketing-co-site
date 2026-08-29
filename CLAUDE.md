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
