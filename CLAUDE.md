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

**Where client-specific decisions get written down**: each client repo
keeps its own `NOTES.md` at the repo root — SEO/keyword research findings
and category decisions, business-fact gaps (missing address, no custom
domain yet, etc.), brand-voice/positioning calls, and anything else that's
true of *that* client but would be noise (or actively wrong) in every other
client's repo. `NOTES.md` is never synced in either direction — the template
repo doesn't have one, and a client repo's `NOTES.md` never gets copied back
here. If you're about to write a client-specific fact into this file, it
belongs in that client's `NOTES.md` instead; if you're documenting a real
bug or a reusable pattern, it belongs here, illustrated with a real example
if one helps (plenty of sections below use a real CMC anecdote to make a
generic lesson concrete — that's fine, the line is "specific facts, kept
out" not "specific examples, kept out").

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

### Domain

- **A client site left on its raw `<username>.github.io/<repo>` GitHub
  Pages subdomain has a real, structural SEO ceiling, independent of how
  good the content is.** Confirmed via Mangools SiteProfiler on CMC's own
  site: Domain Authority 1. Get a custom domain configured as basic
  infrastructure for every client, ideally *before* investing heavily in
  content/SEO work — content built up on a shared-subdomain URL loses
  momentum if the domain changes later, so it's cheaper to fix this early
  than to migrate authority after the fact.

### Local SEO — Google Business Profile & citations

- **The website is not what wins the local map pack — the Google Business
  Profile is.** On-page content and schema markup drive organic blue-link
  rankings and reinforce local relevance, but the map pack's own ranking
  (proximity, category match, review count/recency/rating, NAP citation
  consistency) is won mostly *off* the website. Treat a GBP + citation
  audit as a real phase of every client build, not an assumption covered
  by "do they have one claimed and verified" at intake — claimed and
  verified is not the same as optimized.
- **Audit for real, concrete NAP mismatches across directories** (Google
  Business Profile itself, Psychology Today or the industry-relevant
  directory, Yelp, Facebook, Nextdoor, any local award/chamber listing) —
  don't just confirm they exist. Found live on Freedom Counseling
  Services' real citations: their Google Business Profile and website both
  list `(502) 523-2970`, but their Psychology Today listing showed a
  completely different number, `(502) 878-7153` — a real trust-signal
  mismatch on a high-authority directory that was already ranking
  organically. This kind of thing doesn't show up unless you actually
  check each citation directly, not just confirm a directory listing
  exists.
- **Compare the client's review count/rating against the actual "People
  also search for" competitors shown on their own GBP listing**, not
  competitors picked in the abstract — Google surfaces the real
  comparison set directly on the profile page. A client sitting at 10
  reviews next to a direct competitor with 51 is a concrete, prioritized
  gap, not a vague "get more reviews" recommendation.
- **A counseling/therapy client's review strategy needs different handling
  than a typical local business.** Soliciting Google reviews from therapy
  clients raises a real confidentiality/disclosure question that doesn't
  exist for, say, a plumbing company — a public review can itself reveal
  that someone is in therapy. Don't recommend a generic "ask every client
  for a review" tactic for a clinical practice; defer to the client's own
  ethical/professional judgment on how or whether to solicit reviews
  actively.
- **A migrating client's existing domain may carry real authority worth
  protecting, unlike a from-scratch build.** Freedom Counseling Services'
  real domain (`freedomcounselingservices.org` — confirmed via Mangools
  SiteProfiler after the client initially gave a slightly wrong URL,
  worth double-checking against what's actually live and ranking, not just
  what the client remembers) came in at Domain Authority 15 and was
  already ranking position #4 organically for a real target keyword,
  ahead of several lower-DA competitors — a real, non-zero starting
  position, not a blank slate like CMC's own brand-new domain (DA 1).
  **Proper 301 redirects from every existing indexed URL to its new
  equivalent become a hard requirement during migration in this case** —
  losing that position by resetting to a fresh, unindexed site would be a
  real, avoidable regression, not just a missed opportunity.

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
- **`rsync -a` (without `--delete`) never removes a file from the client
  repo that was deleted in the template repo.** Deleting
  `src/pages/leads.astro` from the template and re-running the standard
  sync command left the old file sitting untouched in the client repo —
  it kept building a stale `/leads` route silently (no error, just a
  route that should be gone still existing) until it was manually
  deleted there too. Any future page/file *removal* in the template needs
  a manual matching delete in the client repo — the sync command only
  ever adds/updates, never subtracts. (Don't reach for `--delete` either:
  the client repo has its own files the template doesn't know about —
  `.env`, client copy, images — that a blanket `--delete` would wipe.)
- **Tailwind's `hidden` class loses to a responsive display utility like
  `md:flex` on the same element, regardless of JS.** `#admin-content` was
  `class="hidden md:flex"`, toggled via `classList.remove('hidden')` on
  login — but Tailwind generates responsive utilities *after* base
  utilities in the compiled stylesheet, so at `md`+ viewport widths
  `md:flex` always wins in the cascade, whether or not JS has removed
  `hidden`. The admin dashboard and the login form rendered simultaneously
  on any screen ≥768px wide, before login. Fixed by toggling
  `element.style.display` (inline styles always beat classes) instead of
  `classList`, in both `adminAuth.ts`'s view-toggle functions and
  `AdminLayout.astro`'s markup (`style="display: none;"` instead of the
  `hidden` class). Any element that needs both a JS-controlled show/hide
  *and* a responsive display value needs this pattern, not `classList` +
  a `hidden` utility.
- **A form field existing in the admin UI doesn't mean the public template
  renders it.** The blog post form (`admin/blog.astro`) collects
  `author_name`/`credentials` — both real, already-existing `pages`
  columns, already fed into `Person` schema in `schema.ts` — but
  `BlogPost.astro` never actually displayed a byline on the rendered page.
  Caught by publishing a real test post and reading the live HTML rather
  than just checking the admin form saved correctly. When wiring a new
  admin-editable field, verify it end-to-end on the *public* page it's
  supposed to affect, not just that the form round-trips to the database.
- **A Supabase content edit doesn't rebuild the live site on its own —
  every admin screen that edits content needs to trigger a rebuild
  itself.** `admin/blog.astro`'s Publish button always called the
  `publish-site` Edge Function, but Phase 4's `admin/content.astro`
  (business info, testimonials, page copy) never did — saving a change
  there silently never went live until something unrelated happened to
  trigger a rebuild (a blog publish, or a manual `gh workflow run`).
  Found while building Phase 6, not by testing Phase 4 itself. Fixed by
  having every save handler call the shared `triggerRebuild()`
  (`lib/publishFunction.ts`). Any *new* content-editing save action needs
  this too — it's easy to add a save button and forget the site doesn't
  rebuild itself just because Supabase accepted the write.
- **An invite/recovery email's destination silently depends on the
  Supabase dashboard's "Site URL" setting, which has no connection to
  the actual code and goes stale the moment a route changes.** Found in
  production, not testing: a real password-reset link sent the client
  to `/leads` — the pre-Phase-3 route — because Site URL had been set
  once, early on, and never updated when Phase 3 moved that page to
  `/admin/leads`. First click 404'd; the second attempt (after fixing
  Site URL in the dashboard) also failed because the original token had
  since expired, requiring a fresh email. **The real fix isn't "remember
  to keep Site URL updated" — it's not depending on it at all.** Every
  call that sends an invite/recovery email now passes an explicit
  `redirectTo`, computed client-side via `window.location.origin +
  withBase('/admin/leads')` at the moment of the call (see
  `admin/team.astro`'s `inviteRedirectTo` and `adminAuth.ts`'s
  "Forgot password?" handler) — this can never drift out of sync with
  the actual app, unlike a dashboard field nobody remembers to revisit.
  `supabase/functions/publish-site`'s `invite`/`resend` actions forward
  whatever `redirectTo` the caller provides straight into
  `inviteUserByEmail(email, { redirectTo })` rather than guessing at a
  fixed value themselves — the function has no reliable way to know the
  site's own public URL from its own environment anyway. Site URL still
  exists as a fallback for anything that doesn't pass `redirectTo`
  explicitly, but nothing in this app depends on it being correct
  anymore. Also added a real self-service "Forgot password?" link to the
  login form itself (previously the agency had to manually trigger a
  reset via script) — same `redirectTo` pattern, so it was the natural
  place to fix this properly rather than as a one-off patch.
- **`ContentPillar.astro` never rendered the `FAQ` component**, even
  though `schema.ts` appends `FAQPage` JSON-LD schema for *any* page with
  a non-empty `faqs` array, independent of `page_type` (`if
  (page.faqs.length > 0) schemas.push(buildFAQSchema(page))`). A Content
  Pillar with `faqs` set was generating structured data for Q&A content
  that was never actually visible on the page — a direct violation of
  this file's own FAQPage rule above, and the kind of gap that only shows
  up once a Content Pillar actually gets real FAQ content, not on a first
  "looks done" pass. Fixed by importing and rendering `<FAQ
  faqs={page.faqs} />` in `ContentPillar.astro`, the same way
  `ServicePage.astro` already did. Any new template that renders a page
  type schema.ts treats as FAQ-eligible needs the same check — don't
  assume a template renders everything schema.ts might describe.
- **`renderCopy()`'s markdown parser had no base-path handling for
  internal links.** A markdown link written directly into `pages.copy`
  (e.g. `[SEO](/seo)`) rendered as a raw `/seo` href — correct in local
  dev, a 404 on GitHub Pages once the site is served under a base path
  (`/<client-repo-name>/`), the same class of bug `withBase()`
  (`src/lib/url.ts`) already exists to prevent everywhere else in this
  app. Nobody had written an inline copy link before, so the gap sat
  unnoticed until the first page that used one. Fixed with a custom
  `marked` `renderer.link` in `lib/markdown.ts` that runs `withBase()` on
  any href starting with a single `/` (external URLs, `mailto:`, `tel:`,
  `#anchors`, and protocol-relative `//` hrefs pass through untouched).
  Any future place that renders markdown from `pages.copy` needs the same
  renderer override, not just `renderCopy()`'s existing call sites.
- **Populating a schema-feeding field without rendering it anywhere is the
  same bug as the FAQ one above, just quieter.** `buildArticleSchema()`
  (`schema.ts`) has always read `author_name`/`date_published`/
  `date_modified` for `Content Pillar` pages and included them in that
  page's JSON-LD (`schema.author`, `schema.datePublished`,
  `schema.dateModified`) — but three of CMC's own Content Pillar pages had
  `author_name`/`date_published` populated with real values while
  `ContentPillar.astro` never rendered a byline anywhere, meaning real,
  live schema was describing a byline no visitor could actually see. Found
  while building the "Reviewed by" byline feature below, not by auditing
  for it directly. Before adding a new field to a `pages` row, check
  whether `schema.ts` already reads it for that `page_type` — if so, either
  render it visibly or don't populate it, never populate-but-hide.
- **A new `page_type` that's meant to stand in for an existing one needs
  every place that switches on the old type updated, not just the
  template file itself.** `Service Hub` was introduced as `ContentPillar
  .astro`'s full feature set plus `PlanSteps`/a CTA button (see below),
  but two other places still only recognized `'Content Pillar'`:
  `BlogPost.astro`'s lookup of a spoke post's owning hub page (`allPages
  .find((p) => p.page_type === 'Content Pillar' && ...)`), and `schema.ts`
  `buildPageSchemas()`'s switch statement, which fell through to the
  generic `WebPageSchema` default for any `Service Hub` page instead of
  `buildArticleSchema()`. Found while starting Freedom Counseling
  Services' real blog posts — every one of their spoke posts would have
  linked back to nothing, and none of their 8 hub pages would have gotten
  Article/BlogPosting schema, despite having real bylines and long-form
  copy identical in shape to a Content Pillar's. `BaseLayout.astro`'s
  `og:type` meta tag had the same `'Content Pillar'`-only check (fixed to
  include `Service Hub` and, since it was an obvious analogous gap once
  spotted, `Blog Post` too — a blog post's own OG type should also be
  `article`, not the `website` default it was silently getting). When
  adding a page type that's explicitly meant to share another type's
  behavior, grep for every literal `page_type === 'Content Pillar'` (or
  whichever type it extends) — a template file being updated doesn't mean
  `schema.ts` or a sibling template's cross-reference logic was.
- **Tailwind Typography's `.prose` class adds its own decorative smart
  quotes around a blockquote's first/last paragraph by default**
  (`content: open-quote`/`close-quote`) — a markdown pull-quote written
  the natural way, with literal quotation marks around a person's actual
  words (`> "..."`, the pattern every `Counselor Profile` bio on Freedom
  Counseling Services uses), rendered as a doubled `""...""` on the live
  page. Not caught on a first "looks done" pass — it only showed up while
  visually verifying a freshly-published page, not from reading the
  markdown source or the component code, since nothing in either one
  looks wrong in isolation. Fixed globally in `global.css` (`.prose
  blockquote p:first-of-type::before, .prose blockquote p:last-of-type
  ::after { content: none; }`) rather than stripping the quote marks out
  of existing/future `copy` content — a global CSS fix means nobody has
  to remember a special "no literal quotes in a blockquote" rule when
  writing copy later. Check any page with a markdown blockquote (`>` in
  `copy`) after this fix lands on a given client site, to confirm the
  double-quote artifact is actually gone, not just that the CSS rule was
  added.
- **`admin/blog.astro`'s hero-image upload/Unsplash picker has existed
  since Lead Magnets (see that section below) — but neither
  `BlogIndex.astro`'s cards nor `BlogPreview.astro`'s related-articles
  cards ever rendered `page.images.hero`, `author_name`, `date_published`,
  or a read-time estimate.** The exact same "populated but nothing
  renders it" shape as the Reviewed-by byline bug and the FAQ-schema bug
  above, just on blog cards instead of a page field — found the same way,
  by actually looking at a real client's live blog index (Freedom
  Counseling Services), not by reading the admin form or the component
  code in isolation. All 10 of Freedom's real posts already had a real
  hero image on file (sourced through the admin's existing Unsplash
  picker) — this was purely a rendering gap, not a missing-content one.
  Fixed by extracting a shared `BlogPostCard.astro` (image, category,
  title, excerpt, author avatar via the new `getAuthorHeadshot()`
  helper, publish date, `estimateReadingTime()`'s "X min read") used by
  both `BlogIndex.astro` (its featured post *and* grid, via a `featured`
  prop that switches to a horizontal image-left layout — was two
  separately hand-rolled card markups before, now one component) and
  `BlogPreview.astro`'s related-articles grid, so a future change to
  what a blog card shows can't land in one place and drift from the
  other two. When adding a new template that lists `Blog Post` pages as
  cards, reuse `BlogPostCard.astro` — don't hand-roll a fourth copy.
  - **A card's own image can't reuse `OptimizedImage.astro` at its
    default settings when the whole card is already an `<a>`** — the
    component's Unsplash-attribution badge is itself an `<a>`, and a
    nested `<a>` inside another `<a>` is invalid HTML with unpredictable
    click behavior across browsers. Caught this before it shipped, not
    after, by tracing through what `OptimizedImage` actually renders
    rather than assuming a component reuse would just work. Fixed with a
    new `showCredit?: boolean` prop (default `true`) on
    `OptimizedImage.astro` — `BlogPostCard.astro` passes `false` for
    both its hero thumbnail and the author-headshot thumbnail, since
    both sit inside the card's own outer link. The full, real attribution
    still shows on the post's own article page (`BlogPost.astro`'s
    `Hero`, which isn't nested inside another link) — this only avoids a
    second, nested one on the card. Any future image placed inside a
    card-as-link needs the same `showCredit={false}`, not a raw `<img>`
    that skips `OptimizedImage`'s compression/dimensions entirely.
  - **`getAuthorHeadshot(authorName, allPages)`** (`src/lib/pages.ts`,
    next to `getCounselorOptions`) matches a Blog Post's `author_name`
    against a live `Counselor Profile` page's `title` — same
    derive-don't-invent discipline as everything else in this project.
    Returns `null` (no avatar rendered, never a broken image) for any
    client with no `Counselor Profile` page type at all, which is the
    normal case for a non-counseling client like Counselor Marketing
    Co.'s own site — the component degrades gracefully rather than
    needing a per-client opt-out.
- **`OptimizedImage.astro`'s own wrapper `<div>` had no height, so a
  percentage-based `h-full`/`object-cover` on the `<img>` inside it had
  nothing definite to resolve against.** CSS only honors `height: 100%`
  when the element's containing block itself has a definite height — a
  plain block `<div>` with no height set falls back to `auto` (sized to
  its content), so `height: 100%` on the image inside it is not a
  percentage of anything and the image renders at its own natural aspect
  ratio instead of being cropped to fill the space. Found while building
  the Hero image focal-point feature: `Hero.astro`'s full-bleed overlay
  image looked visually identical whether `imageFocalY` was `'top'` or
  `'bottom'`, and a live JS inspection of the rendered `<img>` showed its
  `renderedHeight` almost exactly equal to its own `naturalHeight` —
  the tell that it was never actually being cropped into the hero band
  at all, so the focal-point class had nothing to do. This silently also
  affected every other place `OptimizedImage` is asked to fill a sized
  parent via `h-full w-full object-cover` — `BlogPostCard.astro`'s hero
  thumbnails and its author-headshot circles both use this exact pattern
  and were equally uncropped the whole time (`CounselorProfile.astro`'s
  headshot was unaffected — it sizes the `<img>` with fixed `h-56 w-56`,
  not a percentage, which doesn't need a container height to resolve).
  Fixed once, at the component level (`<div class="relative h-full
  w-full">`) rather than patching each call site — this only changes
  behavior where a parent already provides a definite height (the exact
  cases that were broken); everywhere else `height: 100%` still resolves
  to `auto` exactly as before, so this can't regress a normal-flow image.
  Any future component wrapping a sized, filled image needs to pass
  `h-full`/`w-full` sizing all the way down to whichever element actually
  has `object-fit`/`object-position` applied, not just to the innermost
  one — a percentage-based size class has no effect unless every
  ancestor up to the one with a real, definite size also carries it.
- **A template-level fix landing here doesn't mean it reached every
  existing client repo — that's still a manual sync, not automatic.**
  Audited CMC's repo (2026-09-07) against the template and found it was
  still running the pre-fix, buggy `OptimizedImage.astro` above (its
  wrapper `<div>` had no `h-full w-full`) — the fix had landed here and
  in Freedom Counseling's repo (created later, from an already-fixed
  template snapshot) but the "sync this into every existing client"
  step for CMC specifically never happened. Also found two small
  `global.css` polish rules (the StoryBrand Plan's numbered-list accent
  markers, a tighter/heavier Tailwind Typography heading-weight
  override) missing from CMC's copy, and one of the two missing from
  Freedom Counseling's — `global.css`'s `@theme` color tokens are
  deliberately excluded from a wholesale template→client sync (see the
  font-loading section below for why), but a *generic* rule added
  alongside those tokens still needs manually porting into every client
  copy when it lands, and that step is easy to forget precisely because
  the file as a whole is supposed to diverge. All three gaps fixed by
  hand-porting directly, confirmed via `diff` against the template
  afterward, not just "looks right." Worth an occasional `diff -rq` of a
  client repo's `src/` against the template's to catch this class of
  drift rather than waiting to notice it live.

## Client dashboard (`/admin/leads` login)

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

## Lead CRM (`/admin/crm`, built 2026-09-01)

Day-to-day lead management — notes, follow-up dates, a per-lead detail
view, search/filter, CSV export — built as a **separate admin nav item
from `admin/leads.astro`**, not a tab or section bolted onto it. Explicit
client decision: Leads and analytics needs to stay a clean, numbers-only
"proof of value" view — when a client's own customer logs in and sees
the dashboard, that's what shows them their marketing is working. Mixing
in CRM controls (status editing beyond what's already there, note-taking
UI, filters) would clutter that. Same `leads` table, same owner+agency
access level as the rest of lead management — `staff` is out of scope
here until "assign leads to staff" (backlogged, see below) is built.

- **Data model**: `leads.follow_up_date` (nullable `date`) plus a new
  `lead_notes` table (`lead_id`, `note`, `created_by`, `created_at`) —
  see `0017_lead_crm.sql`. Notes are **append-only in v1**: no
  update/delete policy, matching a call-log/activity-log mental model
  rather than an editable field. RLS is the same `is_owner() or
  is_agency()` pattern as everything else lead-related.
- **Status-select markup + the optimistic-update wiring was extracted
  into `lib/leadStatus.ts`** (`renderStatusSelect`,
  `initStatusSelectHandler`) the moment a second page needed the
  identical color-coded-select-with-event-delegation behavior — `admin/
  leads.astro` was refactored to use it too, rather than leaving two
  copies of the same status-update logic to drift apart. Reuse this for
  any third place that ever needs a lead's status editable inline.
- **"Due this week"** surfaces any lead with a `follow_up_date` within
  the next 7 days, with **no lower bound** — an overdue follow-up keeps
  showing (marked "Overdue") instead of silently disappearing once its
  date passes, since a missed follow-up is exactly the thing this
  feature exists to prevent. Closed leads are excluded — no point being
  reminded to follow up with someone already handled. Pure in-app,
  computed client-side from the same `leads` fetch — no email/SMS,
  consistent with holding off on SMTP setup until there's a paying
  client (see the multi-user-roles section's invite-rate-limit note).
- **CSV export respects the current search/filter state**, not the
  whole table — exporting "what's on screen" matches what a client
  filtering down to e.g. "last 30 days, new leads" actually expects.
  Client-side `Blob` + a temporary `<a download>` click, no backend
  involved.
- **Detail view follows the established list/edit-view toggle pattern**
  (`#crm-list-view`/`#crm-detail-view`, `classList.add/remove('hidden')`
  on click) already used by `admin/blog.astro` and `admin/lead-
  magnets.astro`, not a modal — consistent with how every other
  multi-record admin screen in this app handles "show one record in
  full."
- **Verification pattern**: same as the original leads dashboard —
  temporary throwaway leads (name-prefixed `ZZTEST` for easy bulk
  cleanup) and a temporary agency Auth user, both deleted after. Also
  directly confirmed the `lead_notes` RLS policy actually blocks the
  anon key (a `POST` with the anon key came back `401`/`42501`, and a
  `SELECT` came back an empty array rather than real rows) — the same
  "don't just trust the UI, hit the REST API directly" discipline used
  throughout Phases 4-6 of the Admin CMS.
- **Backlogged, explicitly not built in this pass** (client's own
  call, revisit if a real need shows up): assigning a lead to a specific
  staff member (ties into the existing role system, most useful once a
  group-practice client exists); tagging/categorizing leads by service
  interest or urgency; a full contacts-vs-leads relational remodel (one
  contact, many interactions/lead events, instead of today's flat
  `leads` rows); two-way email reply from the dashboard (needs real
  SMTP infrastructure — see the invite-rate-limit note in the
  multi-user-roles section, held off until there's a paying client to
  justify the Resend/Postmark cost).
- **"+ Add lead"** (built 2026-09-01) covers a lead that came in some
  way other than the site's own form — a phone call, a walk-in, a
  referral — via a small modal (name/email/phone/status/notes) that
  inserts straight into the same `leads` table. No new migration needed:
  `leads`' existing `"public can insert leads"` policy (`for insert with
  check (true)`, there for the anonymous contact-form submission) already
  covers an authenticated admin session too, since a permissive policy
  with no `to` clause applies to every role. **The row is tagged
  `source_page = 'Manually added'`** (a fixed sentinel, exported as the
  `MANUAL_SOURCE` constant in `admin/crm.astro`) rather than left null —
  this is what makes it show up on Leads and analytics as its own
  honest, clearly-labeled bucket in "Leads by page" instead of being
  silently folded into `(unknown page)` or misattributed to a real page.
  Leads and analytics needed **zero code changes** to pick this up: it
  has no source filtering at all, so total/this-month/last-month/the
  weekly chart all include a manually-added lead automatically just by
  virtue of it being a `leads` row — verified live, not assumed. After
  saving, the modal closes and jumps straight into the new lead's detail
  view, since adding a note or setting a follow-up date is the near-
  certain next step.
- **Archive and delete** (built 2026-09-01), both CRM-only — Leads and
  analytics has no delete/archive UI and never will; that page stays a
  read-only, numbers-only view. An **Actions ▾** menu on each list row
  (View / Archive / Delete) replaced the old plain "View" text — the
  same three actions are also available as buttons in the detail view,
  for whichever lead you're already looking at.
  - **Archive is a soft-hide, not a data change client-facing dashboards
    ever see**: `leads.archived_at` (nullable timestamptz,
    `0018_lead_archive_and_delete.sql`) just filters an archived lead out
    of the CRM's own default list (a "Show archived" checkbox brings it
    back, and un-archives). **Leads and analytics has zero
    archived-awareness** — deliberately: an archived lead keeps counting
    toward every stat there exactly as before, since archiving only means
    "get this out of my active CRM view," not "this didn't happen."
    Confirmed this decision explicitly with the client before building —
    the two are easy to conflate and hard to walk back once real data
    depends on the answer.
  - **Delete is a real, hard delete** — `leads` had no DELETE RLS policy
    before this (nothing needed one), so `0018` adds
    `"admin can delete leads"` (`is_owner() or is_agency()`). This is
    what actually reduces the Leads and analytics numbers, confirmed
    live: deleting a lead drops the total/weekly-chart/by-page numbers
    immediately, since that page just counts whatever rows exist in
    `leads`. `lead_notes.lead_id` already cascades on delete (see
    `0017_lead_crm.sql`), so a deleted lead's notes go with it — no
    orphaned rows. Gated behind the same `window.confirm(...)` pattern
    already used for delete buttons elsewhere in this app
    (`admin/blog.astro`, `admin/lead-magnets.astro`).
  - Archive/delete logic (`setArchived`, `deleteLead`) is written once
    and called from both the row menu and the detail view — same reuse
    discipline as the status-select extraction above.

## Contacts vs. leads (built 2026-09-06)

A lead-magnet download (`leads.lead_magnet_id` set) and a real
appointment-request submission (`lead_magnet_id` null) are kept as two
distinct categories across the admin, not blended into one "leads"
number — a download is a much earlier-funnel, lower-intent signal than
someone actually asking to be matched with a counselor. No schema
change needed: this is purely a UI/dashboard-logic split on data that
already existed.

- **Leads and analytics (`admin/leads.astro`) filters every stat/chart/
  table down to real leads only** (`lead_magnet_id IS NULL`) — total,
  this-month/last-month, the weekly chart, "Leads by page," and the
  table all exclude downloads entirely, protecting this page's original
  founding rule (see "Client dashboard" above): a clean, numbers-only
  "proof of value" view a client's own customer can point to, never
  inflated by a lower-intent signal.
- **A dashed-border, muted "Guide downloads" widget on that same page**
  surfaces the download numbers anyway, deliberately separate and
  visually subordinate rather than a 4th stat in the main grid — this-
  month/last-month raw counts (un-deduplicated, consistent with how the
  main lead stats count every submission, not distinct people), plus an
  all-time **"X downloads → Y became leads (Z%)"** conversion stat.
  Hidden entirely (not just empty) on any site with zero lead-magnet
  downloads. The conversion stat matches by normalized email
  (`trim().toLowerCase()`) across `Set`s of contact/lead emails,
  deduplicated on both sides — someone who downloaded two guides or
  submitted the appointment form twice isn't double-counted.
- **The CRM (`admin/crm.astro`) gets a Leads/Contacts segmented toggle**
  above the filter bar — deliberately only two options, no "All," since
  the whole point is to never see the two blended together by default.
  Switching views repartitions the table, changes what the Source
  filter's own dropdown options mean (Contact form/Manually added for
  Leads; a live list of guide titles for Contacts), hides "+ Add lead"
  in the Contacts view (a manually-added row is always a real lead, so
  it would never even show up there), and changes the CSV export
  filename (`leads-<date>.csv` / `contacts-<date>.csv`) and the
  singular/plural noun in the row-count text. A new **Source** column
  in the table shows which guide a contact downloaded, or "Contact
  form"/"Manually added" for a real lead.
- **Verification pattern**: typechecked (`astro check`) and built
  (`npm run build`) clean in the template repo and both live client
  repos (Freedom, CMC) before syncing — no seeded test data needed here
  since this is pure client-side filtering/rendering logic over data
  the existing `loadLeads()` fetch already returns, not a new query or
  a new write path.

## Multi-provider lead routing ("Select a Counselor", built 2026-09-03)

An opt-in "Select a Counselor" dropdown + "Help me choose" default on
`LeadGenerator`, for any group-practice client with more than one
provider — first requested for Freedom Counseling Services (5 counselors,
a real version of this already live on their previous site) and made a
standard template feature rather than a one-off, since any future
group-practice client has the same need.

- **Opt-in via `business.collect_counselor_preference`**
  (`0023_counselor_preference.sql`), same pattern as
  `collect_website_in_leads` — a solo-practice or non-counseling client
  just doesn't set it, and the dropdown never renders.
- **The counselor list is never hand-curated** — `getCounselorOptions()`
  (`src/lib/pages.ts`) derives it live from whichever pages currently have
  `page_type = 'Counselor Profile'`, the same self-maintaining-list
  discipline as the service_group-driven grids. Add a new counselor's
  profile page and they appear in the dropdown automatically; remove one
  and they disappear. Every template that renders `LeadGenerator` calls
  this helper and passes the result through — don't reintroduce a
  hardcoded list on a future template.
- **Stored as a real foreign key**, not a free-text name —
  `leads.preferred_counselor_page_id references pages(id) on delete set
  null`. A counselor rename is reflected automatically on every past lead;
  a free-text column would have gone stale the moment someone got married
  or a name was misspelled once.
- **Pre-selected on a counselor's own profile page** — `CounselorProfile.astro`
  passes `defaultCounselorId={page.id}` so a visitor who already navigated
  to a specific counselor's page doesn't have to re-select them from the
  dropdown; every other template leaves it on "Help me choose".
- **Every template that renders `LeadGenerator` needs this threaded
  through** — `collectCounselorPreference={business.collect_counselor_preference}`
  and `counselors={getCounselorOptions(allPages)}` on every call site,
  including both of `Homepage.astro`'s (the embedded Hero-aside card and
  the full form). A new template that renders `LeadGenerator` and forgets
  this will just silently never show the dropdown even when the business
  has it enabled — no error, just a missing field. Check for this the
  same way the FAQ-rendering bug above got missed the first time.
- **Surfaced in both admin lead views**: `admin/leads.astro`'s table gets
  a Counselor column, `admin/crm.astro`'s detail view gets a "Counselor
  preference" field and the CSV export includes it — collecting a
  preference nobody in the admin dashboard can see would defeat the
  point. Both pages resolve the stored page id to a name via a live
  `page_type = 'Counselor Profile'` query, same derivation as the public
  dropdown, not a cached/stale list.

## Reviewed-by byline for pillar/hub pages (built 2026-09-03)

A "Reviewed by [name], [credential] — Updated [date]" byline for
`Content Pillar` pages only, standard for every client going forward, not
a one-off — requested after Freedom Counseling Services' previous site
turned out to already have exactly this pattern on its service pages.

- **No new columns.** Reuses `author_name`/`credentials`/`date_modified`
  — already schema-scoped to `Content Pillar` in `0001_init.sql`, and
  already read by `buildArticleSchema()` for that page type. The gap was
  never the data model, it was that nothing rendered these visibly (see
  the matching entry in "Real bugs found and fixed here" above) or gave a
  client any way to edit them.
- **`ContentPillar.astro` renders the byline** right under the Hero,
  conditionally on `author_name` being set — a pillar with no reviewer on
  file (a case-study/proof page, say) just shows nothing, same "optional,
  never invented" discipline as everything else on this page type.
  `ServiceHub.astro` (see its own section below) renders the identical
  byline the same way — both are "pillar/hub" page types for this
  purpose.
- **Admin UI lives inside `admin/content.astro`'s existing "Page copy"
  section**, gated to `page_type` being `'Content Pillar'` or `'Service
  Hub'` (`BYLINE_PAGE_TYPES`, hidden entirely for any other page), not a
  new top-level section — this is what the client asked for specifically,
  and it also means the page picker/tier-note infrastructure that section
  already has doesn't need duplicating.
- **Its own save button, deliberately not folded into the tier-gated one
  above it.** `author_name`/`credentials`/`date_modified` aren't columns
  `enforce_content_permission` protects, so they're editable by any
  `owner` regardless of `content_permission_level` — but the existing
  Page copy save button's visibility is driven by `canEditAnyField()`,
  which is false for a restricted-tier owner on every *other* field in
  that section. Reusing that button would have made the byline
  inaccessible to exactly the clients who most need a simple, always-on
  field. Same reasoning as Testimonials already having its own
  independent save button on this same admin page.
- **Backfilled on CMC's own site** (three Content Pillar pages already had
  `author_name`/`date_published` set with no visible byline — the exact
  invisible-schema bug this pass fixed) — `Luke Burgett, LPCA`, matching
  his real, verified credential from Freedom Counseling Services' site
  rather than the vaguer "licensed counselor" phrasing used in CMC's own
  About page copy. Real credentials for schema/E-E-A-T purposes should
  come from the most specific, verifiable source available, not whatever
  marketing copy happens to say.
- **A newline between two JSX expressions renders as a literal space** —
  `{page.author_name}\n{page.credentials && <>, {page.credentials}</>}`
  rendered as "Luke Burgett , LPCA" (extra space before the comma), caught
  live on this exact byline. `BlogPost.astro`'s near-identical author byline
  had the same latent bug — nobody had caught it there yet only because no
  client site has a real Blog Post live to render it against. Fixed both by
  writing adjacent conditional fragments on one line with no whitespace
  between them, not split across lines for readability. Watch for this
  anywhere a comma/punctuation needs to sit directly against a conditional
  expression's output.

## Admin CMS: Edge Functions for anything needing a secret at request time

Built in phases (business info fields → Edge Function → blog posting →
website content editing → multi-user roles → agency role) so client-site
admins can manage content from their own login instead of touching
Supabase directly. All six phases are documented in full below — this
section is the durable, template-level pattern worth reusing on every
future piece, not a summary pointing elsewhere.

**`supabase/functions/publish-site`** (built 2026-08-30) is the first Edge Function
and the pattern to copy for anything similar: the static site can't run server code,
so any action needing a secret credential at the moment an admin clicks a button (a
GitHub token to trigger a rebuild, later the service_role key to invite a staff
login) has to live in a Supabase Edge Function, never in browser JS. Secrets go in
via `supabase secrets set KEY=value --project-ref <ref>`, never a repo file, never a
`.env` shipped to the browser.

**Real bug found and fixed while building it**: the Functions gateway's `verify_jwt`
(the default — never disable it) blocks a request with no validly-signed JWT at all,
but that's not the same as "caller is a logged-in user." The public anon key is
*itself* a validly-signed JWT (role `anon`) and it's shipped in the site's own JS —
so `verify_jwt` alone would let anyone holding the anon key invoke the function.
Every function gating a real admin action needs its own explicit
`supabase.auth.getUser()` check on top of `verify_jwt`, using the request's own
`Authorization` header. Caught this by actually testing with the anon key as the
bearer token, not just testing "no auth header" — that weaker test would have missed
it entirely. See `frontend-site-builder-supabase/references/
supabase-technical-setup.md` for the exact code pattern.

**Blog post content is a rich-text editor, not a raw markdown textarea**
(built 2026-08-30, `admin/blog.astro`). Real client feedback on the first
version: non-technical clients don't know markdown syntax. `pages.copy`
itself stays plain markdown in the database — unchanged for every other
page type and for the copywriter pipeline — the admin editor just
round-trips through it silently: `renderCopy()` (already in
`lib/markdown.ts`) renders existing markdown to HTML to seed a
`contenteditable` div on load, and `turndown` converts the edited HTML
back to markdown on save. The toolbar (a block-style dropdown —
Paragraph/Heading 2/Heading 3, deliberately no Heading 1 since that's
reserved for the post title and a page should only have one — plus
bold/italic/underline/link) is driven by `document.execCommand`. That API
is deprecated but still the only way to drive a plain `contenteditable`
without adopting a full editor framework (TipTap/ProseMirror) for a
five-command feature set on one low-traffic internal page — a deliberate
scope call, not an oversight. One real wrinkle: clicking a toolbar button
blurs the editor and collapses the text selection before the click
handler runs, so the last selection inside the editor has to be tracked
(on `keyup`/`mouseup`/`input`) and explicitly restored immediately before
every `execCommand` call — skipping this makes every toolbar button
silently apply to the wrong place (or nowhere). Markdown has no
underline syntax, so underline is deliberately kept as inline `<u>` HTML
in the stored markdown — `marked` (the renderer everywhere else on the
site) passes inline HTML through untouched, so this doesn't break
anything downstream. If a future admin field needs the same "non-technical
person edits markdown-backed content" shape, reuse this pattern rather
than shipping a raw markdown textarea and rather than migrating the
storage format.

**Admin shell restructure (built 2026-08-30)**: every admin-facing route
moved under `/admin/*` — the leads dashboard is now `admin/leads.astro`
(was `leads.astro`), joined by `admin/blog.astro` for blog post CRUD.
Both share `layouts/AdminLayout.astro` (login view, invited-user
set-password view, sidebar nav + slot) and `lib/adminAuth.ts`
(`initAdminAuth(onAuthed)` — session check, login/logout, invite/recovery
password setup). Astro has no client-side router, so each `/admin/*`
page's own inline `<script>` imports and calls `initAdminAuth`
independently — the persisted Supabase session (localStorage) is what
makes "stay logged in across pages" work, not shared JS state. Any new
admin page (Phase 4's website content section, etc.) follows this same
shape: add a nav entry to `AdminLayout.astro`, use the shared auth module,
don't reinvent the login flow. `robots.txt.ts` and `astro.config.mjs`'s
sitemap filter both gate on the `/admin` prefix now, not `/leads`
specifically. See the real-bugs list above for two issues found while
building this (the rsync-deletion gap and the Tailwind `hidden`/`md:flex`
bug) — both are general patterns, not one-off admin-page mistakes.

**Website content section (`admin/content.astro`, built 2026-08-30) —
content-permission tiers are enforced server-side, not just hidden in the
UI.** `business.content_permission_level` (`'restricted'` | `'full'`,
default `'restricted'`) drives which fields render editable vs.
locked-with-a-suggestion. Three sub-areas on one page:
- **Business info** (phone, email, address, `client_portal_url`) — safe on
  every tier, a plain form, direct `business` UPDATE.
- **Testimonials** — a page picker + quote/author/role, safe on every
  tier, direct `pages` UPDATE (these columns aren't covered by the trigger
  below, so this works regardless of tier).
- **Page copy** — a page picker (every page type except Blog Post/Blog
  Index, which have their own section) showing: `h1`/`meta_description`/
  `focus_keyword` always locked, on every tier; `hero_subhead`/`copy`/
  `images` locked unless the tier is `'full'`. The `copy` field reuses the
  same rich-text-editor-backed-by-markdown pattern as the blog editor
  (see below) — extracted into `components/RichTextEditor.astro` +
  `lib/richTextEditor.ts` specifically so this section didn't have to
  duplicate it.

**The tier restriction is enforced by a Postgres trigger
(`enforce_content_permission()`, `0011_content_permission_and_suggestions.sql`),
not merely by which controls the UI renders.** RLS alone can't do
column-level checks (`USING`/`WITH CHECK` only see the row, not which
columns changed), so a `BEFORE UPDATE` trigger on `pages` compares
`NEW`/`OLD` per protected column and raises an exception if a locked field
changed — `h1`/`meta_description`/`focus_keyword` unconditionally, `hero_subhead`/
`copy`/`images` only when `business.content_permission_level <> 'full'`.
Blog Post rows are exempt from the trigger entirely (`new.page_type =
'Blog Post' then return new`) — that's new additive content the client
fully owns creating via `admin/blog.astro`, not part of this tiered system
for editing *existing* pages. Verified this is real enforcement, not just
UI theater, by calling the REST API directly with a valid authenticated
session and no admin UI involved: got back the trigger's own Postgres
exception (`P0001`), not a silent no-op or a UI-only block.

**Locked fields get a "Suggest an edit" affordance
(`components/SuggestEdit.astro`, the `content_suggestions` table)
instead of a save button.** Every client site gets the ability to
*submit* a suggestion (`page_id`, `field_name`, `current_value` snapshot,
`suggested_value`, `submitted_by`). The review side — approving a
suggestion and applying it to the live page — is the `agency`-only
Suggestions screen described further down under "A third admin role,
`agency`"; it wasn't built yet when this paragraph was first written, and
this note is what's stale, not the app. The submit-side RLS policy is
intentionally simple: any authenticated
user can insert, and can read back only their own submissions
(`auth.uid() = submitted_by`) — good enough for a single-owner-login site;
Phase 5's multi-user roles may need to revisit the read policy so an
`owner` can see suggestions submitted by `staff`.

**Verification pattern for this section, since (unlike blog posts) it
edits real existing page content, not disposable new rows**: capture the
exact current value of every field about to be touched *before* testing,
make the edit, verify it saved (including a direct REST bypass attempt
with the temp user's own session to confirm the trigger really blocks a
locked field — got the `P0001` exception back), then restore the exact
original value and verify that too, rather than just trusting an "it
looked right" pass. Confirmed the rich-text editor's markdown round-trip
is lossless against real production copy (bold text, multiple headings),
not just synthetic test content. `content_permission_level` was flipped
to `'full'` temporarily to test that path, then reverted — CMC's own site
stays on the schema default (`'restricted'`) since it isn't a real tiered
client of its own product.

**Website content split into two admin pages + a collapsible nav group
(2026-09-06).** The single `admin/content.astro` above (business info +
testimonials + page copy stacked in one scroll) grew enough to split:
`admin/content/business-info.astro` (business info + testimonials) and
`admin/content/page-copy.astro` (page copy, including the reviewer
byline sub-block and the "Your suggestions" history list — both stayed
with page copy since that's what most suggestions are about).
`admin/content.astro` itself is now just a 302 redirect to
`business-info` so any old bookmark/link keeps working. `AdminLayout.astro`'s
nav gained its first parent/child group for this — "Website content" is
a `<button data-nav-toggle>` + nested `<ul data-nav-submenu>`, toggled by
a small vanilla script at the bottom of that file (no persistence across
page loads; defaults collapsed unless the current page is one of its
children, which is computed server-side from the `current` prop so the
group opens already-expanded on first paint, not via a client-side
flash). Both child nav items carry `data-nav-key="content"` — the same
single key the old flat item used — specifically so `adminAuth.ts`'s
`applyNavAccess()`/`ROLE_NAV_ACCESS` didn't need to change at all; the
two children still show/hide as one unit per role, exactly as before.
The child's own distinct key (`content-business-info` /
`content-page-copy`) is only used for current-route highlighting and the
default-expanded check, never for role gating. If a future page ever
needs the two children gated separately by role, `ROLE_NAV_ACCESS` and
this shared-`navKey` trick both need revisiting together.

**Multi-user roles (`admin_users`, built 2026-08-31) — two roles only,
`owner` and `staff`.** Owner has full access; staff is scoped to blog
posts only, and only their own (owner can edit/delete anyone's).
`admin_users` (`id` referencing `auth.users`, `email`, `role`, `status`
`'pending'`/`'active'`) is a real Postgres table, not JWT metadata, so
"who has access" is a normal query the Team screen renders directly.
`pages.created_by` records which admin login actually created a Blog Post
row, kept separate from `author_name`/`credentials` (the public byline) —
a staff member's login and their byline won't always match.

- **Self-referential RLS via a `SECURITY DEFINER` helper, not a raw
  subquery.** A policy on `admin_users` that needs "is the caller an
  owner?" can't safely query `admin_users` again in its own `USING`
  clause (that re-triggers `admin_users`' own RLS on the inner query).
  `is_owner()` is `SECURITY DEFINER`, so it looks itself up bypassing
  RLS — the standard pattern for this, reused by every other role check
  in `0012_multi_user_roles.sql` (blog CRUD, business/non-blog-pages
  UPDATE, leads, content_suggestions).
- **Every existing "any authenticated user" policy from Phases 3-4 got
  rewritten to be role-aware** — blog CRUD now checks `is_owner() OR
  created_by = auth.uid()`; business/non-blog-pages/leads/
  content_suggestions all became owner-only (`is_owner()`). Any *new*
  write policy added later needs the same treatment — "authenticated"
  alone is no longer a sufficient check anywhere admin roles matter.
- **An invited user activating their own account is the one
  client-reachable write path onto `admin_users`**, and it's narrowed to
  exactly that by a trigger (`enforce_admin_user_self_activation`), not
  just the RLS policy — RLS alone can't stop someone from flipping their
  own `role` to `'owner'` in the same UPDATE call that legitimately
  flips `status` from `pending` to `active`. Same "RLS can't do
  column-level checks, use a trigger" pattern as Phase 4's
  `enforce_content_permission`.
- **The invite/resend Edge Function is the same `publish-site` function
  from Phase 2, extended with an `action` field** (`'publish'` |
  `'invite'` | `'resend'`), not a new function — this was deliberately
  left as a seam in Phase 2's own code comment, since invite/resend need
  the identical "verify_jwt isn't enough, check the caller's own
  session" preamble `publish` already has, plus one more check:
  `invite`/`resend` also confirm the caller is an *active owner* in
  `admin_users` (via the service_role client, bypassing RLS) — "is a
  real logged-in admin" isn't tight enough for an action that can create
  other admin logins.
- **This project's Supabase instance uses the default shared email
  service, which has a low, easy-to-hit send rate limit** (a few emails
  per hour) — discovered while testing the invite flow, not from
  documentation. A real client sending several staff invites in a short
  window will hit "email rate limit exceeded." Custom SMTP (see the
  "Custom SMTP (Resend)" section below) removes this ceiling — set up
  for CMC ahead of onboarding its first real client, specifically
  because onboarding itself (inviting the client's login, them using
  "forgot password") is exactly the moment this limit gets hit.
- **Resend is written to work whether or not Supabase's API resends
  cleanly for an already-invited-but-unconfirmed email** (behavior that
  turned out to be untestable live, due to the rate limit above): try
  `inviteUserByEmail` again first, and if that errors, fall back to
  deleting the stale unconfirmed Auth user + `admin_users` row and
  inviting fresh — so "Resend" works either way rather than depending on
  one specific undocumented API behavior.
- **Nav access and page redirects are enforced in `adminAuth.ts`, not
  per-page** — `initAdminAuth`'s `{ ownerOnly: true }` option (set on
  leads/content/team, omitted on blog) redirects a `staff` login to
  `/admin/blog` before it ever renders an owner-only page, and
  `applyNavAccess()` hides sidebar nav items (`data-nav-key` on each
  `<li>` in `AdminLayout.astro`) a role can't use. RLS is still the real
  boundary (a staff login hitting `/admin/content` directly would just
  see a page whose writes silently fail otherwise) — this is the good
  UX layered on top of it, not a substitute for it.
- **Verification pattern**: temporary throwaway `owner` and `staff`
  Auth users + `admin_users` rows (created directly via service_role,
  bypassing the real invite email entirely, specifically to avoid the
  rate limit above) — logged in as each through the real browser to
  confirm nav filtering and redirects, then confirmed the RLS boundaries
  hold even when bypassing the UI entirely: a direct REST call as the
  staff session attempting to update/delete an owner-authored blog post,
  update `business`, or read `leads` all came back as either a hard
  rejection or an empty/no-op result, never a silent success. Revoked
  the temp staff mid-session and confirmed they landed on the new "No
  access" view on their next load, not a broken or stuck state. The real
  Counselor Marketing Co. owner login was backfilled directly into
  `admin_users` (`role = 'owner'`, `status = 'active'`) via service_role
  — never touched or logged into for any of this testing.

**A third admin role, `agency` (Phase 6, built 2026-08-31) — the
agency's own super-admin identity on every client site, not another
instance of `owner`.** Planned in a dedicated conversation before
building (same discipline as the original Admin CMS plan) after the
first version of Phase 6 — a "mark reviewed, edit manually" suggestion
screen gated to plain `owner` — turned out to not match the real
business need: the agency needs to log into *any* client's site as
themselves, distinctly from that client's own owner, with the review
screen able to apply an approved edit immediately rather than requiring
a manual SQL workaround afterward.

- **Why this isn't (and can't be) one universal login across every
  client project.** Each client site has its own separate, isolated
  Supabase project — deliberately, for real data isolation — and Supabase
  Auth is inherently per-project; a session token from one project means
  nothing to another. True single-sign-on across every client site would
  need real federated-auth infrastructure (Supabase's third-party-auth
  support, or similar) — possible, but not worth building with zero real
  clients yet. What Phase 6 actually delivers instead: one consistent
  identity (same email/password) seeded as an `agency`-role `admin_users`
  row on every client project at onboarding, so logging into any given
  client's `/admin` feels the same each time even though it's technically
  a separate login per project. **Security tradeoff worth knowing**:
  reusing the same password across every client project means a breach
  of any one client's project exposes a password worth trying against the
  others — use a strong password you don't reuse anywhere else, even
  though the same one gets seeded everywhere.
- **`agency` is exempt from the `enforce_content_permission` trigger
  entirely** (`0013_agency_role_and_suggestion_review.sql`) — they're the
  ones enforcing the content-permission lock on everyone else, not
  subject to it. This is what lets approving a suggestion write the new
  value straight to the page in the same action, instead of a two-step
  "mark reviewed, then separately hack around the lock" flow.
- **Every RLS policy that was `owner`-gated in Phases 3-5 was widened to
  `is_owner() or is_agency()`** (business, non-blog pages, blog CRUD,
  leads, admin_users read) — `agency` is a strict superset of `owner`,
  never narrower. `content_suggestions` is the one exception with
  deliberately asymmetric read access: `owner` can only ever read their
  *own* submissions (`auth.uid() = submitted_by`) — that's the "Your
  suggestions" status list on `admin/content.astro` — while `agency`
  reads and manages everything, for the review screen.
- **An owner can never revoke an `agency` row — enforced by RLS, not a
  hidden button.** `"owner can delete non-agency admin_users rows"`
  explicitly excludes `role = 'agency'` from what a plain owner's delete
  policy covers; only another `agency` login can revoke one. Without this,
  a client could accidentally (or deliberately) lock the agency out of
  their own site by clicking Revoke on what looks like just another team
  member.
- **Granting the `agency` role itself is checked in the Edge Function,
  narrower than the general owner-or-agency invite check**: only an
  *existing* `agency` caller can invite a new `agency`-role user — a
  client's own `owner` login can invite `staff` or `owner`, never
  `agency`. Otherwise a client could grant themselves (or anyone) the
  same lock-bypassing super-admin access the agency has.
- **The Suggestions review screen (`admin/suggestions.astro`,
  agency-only) applies an approved edit immediately** by writing the
  edited value straight to the corresponding `pages` column (a small
  field→column map; the reviewer can tweak the suggested value before
  approving, not just accept it verbatim) and triggering a rebuild —
  **except image suggestions**, which stay informational-only (a
  suggestion for `images` is free text, not a structured `{url, alt}`
  value, so there's nothing to auto-apply — the note explains this
  in-UI, and the agency still swaps the actual photo via Website
  content). Rejecting requires a note; approving's is optional. Both are
  shown back to the client on their own "Your suggestions" list — most
  important on a rejection, so they know why.
- **Notification strategy is deliberately the cheapest option, not a
  webhook**: a pending-count badge on the Suggestions nav item (any
  `agency` login sees it on login, on any admin page — not just when they
  happen to visit Suggestions). Real email/Slack alerts are backlogged —
  add them when checking in on client sites regularly stops being enough,
  not before.
- **The client directory (a private list of every client's admin URL) is
  a client-repo-only feature, not template code** — it's a business tool
  specific to running the agency, with no meaning on a generic client
  site, so it doesn't belong in the shared template at all (same
  reasoning as the original plan's "review UI is Counselor-Marketing-Co-
  only," just now actually followed through on for this one piece — the
  review screen itself ended up generic/reusable per-client instead, per
  the locked Phase 6 plan). Lives at `admin/directory.astro` in the
  client repo only, reachable by URL (bookmarked), deliberately not added
  to the shared nav.

## Custom SMTP (Resend), configured for CMC 2026-09-01

Removes the low, easy-to-hit rate limit on Supabase's default shared
email service (see the real-bugs list above) — set up ahead of
onboarding CMC's first real client, since inviting that client's login
(and them later using "forgot password") is exactly the moment the
default limit gets hit. Provider is Resend: a real free tier (3,000
emails/month, 100/day, no credit card) comfortably covers one or a few
client sites' transactional auth email (invites, password resets),
where Postmark has no free tier at all. Configured in Supabase Dashboard
→ Authentication → Emails → SMTP Settings — host `smtp.resend.com`,
port `587`, username `resend`, password is a Resend API key scoped to
"Sending access" only.

**The sender address must live on the exact domain/subdomain verified
in Resend — not assumed to be the root domain.** Resend (like most
providers) lets you verify a subdomain instead of the root domain for
sending — a common, often-recommended pattern, since it isolates
transactional-email reputation from the root domain and avoids
colliding with any existing mail setup on the root (here, the
registrar's default email-forwarding SPF record). CMC's domain
(`counselormarketingco.com`, via Namecheap) was verified in Resend as
`communications.counselormarketingco.com`, not the root — first attempt
at wiring this up used a sender address on the root domain
(`no-reply@counselormarketingco.com`) purely from assuming root-domain
verification without checking, and Supabase's `recover()` call failed
outright with a generic 500 "Error sending recovery email" — no
specific reason given. Fixed by pointing the sender address at the
actually-verified subdomain (`no-reply@communications.
counselormarketingco.com`) instead. When wiring up SMTP for any future
client, **confirm which exact domain/subdomain Resend shows as verified
before picking a sender address** — don't assume it's the root domain
just because that's what the client owns.

Also worth knowing: Resend auto-generates its own SPF/MX records scoped
to a `send.` sub-subdomain under whatever domain you verify (e.g.
`send.communications.counselormarketingco.com` here) — nothing needs to
be manually merged into the root domain's own SPF record for Resend to
work. The root domain's SPF (if any) only matters for that domain's own
separate mail setup (Namecheap's email-forwarding feature, in CMC's
case) — entirely unrelated to whether Resend can send.

**Verification pattern**: a disposable inbox from a temp-mail service
(not a Supabase test account with a fake domain — this needs to prove
actual delivery, not just that Supabase's API accepted the request) —
created a throwaway Supabase Auth user with that address, triggered a
real `recover()` call through the same public `/auth/v1/recover`
endpoint the live "Forgot password?" link uses, and confirmed the email
actually arrived with the correct sender, subject, and a `redirect_to`
pointing at `/admin/leads` (matching the redirectTo fix above) inside
the reset link. Confirms the whole chain — Supabase → Resend → inbox —
not just that the SMTP settings form saved without erroring.

## Lead Magnets (gated content downloads, built 2026-08-31)

Planned in a dedicated conversation before building, same discipline as
the Admin CMS phases. A **`LeadMagnet`** — deliberately not called "Lead
Generator," which was already taken by `LeadGenerator.astro`, the site's
plain contact-request form used across 9 templates — is a gated-download
widget an owner/agency assigns to at most one page at a time: a visitor
trades name+email for an instant download link to a file (a PDF guide,
typically). Genuinely new infrastructure, not just another admin screen:

- **`lead_magnets` table, one row per page (`unique` on `page_id`)** —
  the public template has exactly one fixed slot for this widget, so two
  magnets on the same page would be ambiguous about which renders.
  `admin/lead-magnets.astro`'s page picker only offers pages that don't
  already have one assigned (except the page the magnet being edited is
  already on).
- **Reuses the existing `leads` table rather than a separate one** — a
  new nullable `leads.lead_magnet_id` column ties a captured lead back to
  which magnet produced it. This was the whole point: a magnet
  submission is just a normal `leads` row, so it shows up in the
  Leads and analytics dashboard that already existed, for free, and
  per-magnet capture counts are a one-line `count(*) where
  lead_magnet_id = X` — no new dashboard plumbing needed there.
- **Placement is standardized, not left to vary per page**: every
  template that has the CTA → LeadGenerator pattern gets
  `<LeadMagnet pageId={page.id} />` inserted immediately before the
  final `LeadGenerator` (after the mid-page `CTA`, not competing with
  it). Considered placing it mid-body-copy instead (closer to the
  specific content it's related to, a legitimate content-marketing
  pattern) but rejected for v1: `page.copy` is one opaque markdown blob
  rendered as a single HTML dump with no existing seam to split it at,
  and this project has an explicit rule against letting two CTAs compete
  on the same view (see `Hero.astro`'s `showAside` pattern) — a second
  ask mid-flow through the StoryBrand arc risks diluting the main one.
  `LeadMagnet.astro` does its own build-time Supabase query
  (`getLeadMagnetForPage`, `lib/leadMagnets.ts`) rather than being
  threaded through `[...slug].astro`'s existing prop chain — it renders
  nothing when the page has no magnet assigned, so it's safe to drop
  into every template unconditionally.
- **Delivery is an instant on-page download link, not an emailed PDF** —
  simpler, and the guide is available immediately rather than waiting on
  an email. This was originally also because the template had zero
  transactional-email infrastructure; that's no longer true (see "Custom
  SMTP (Resend)" above) but the on-page link stayed the right call
  anyway once SMTP existed — no reason to add an email round-trip delay
  to something that already works instantly. See "Lead magnet nurture
  sequences" below for where email *does* now fit into this feature.
- **The file bucket (`lead-magnet-files`) is public, same reasoning as
  `site-images`** — this app has no signed-URL delivery mechanism
  anywhere, and building one just for this would be real new complexity
  for content that isn't actually sensitive. A random-UUID-prefixed
  storage path (not the original filename) is the actual gate — not
  cryptographically secure, but proportionate for a marketing PDF.
- **Live Unsplash search is genuinely new infrastructure, not a UI
  addition to an existing feature.** Every other image picker in this
  app (`admin/blog.astro`, `admin/content.astro`) only ever supported
  direct upload — Unsplash sourcing elsewhere in this project is a
  one-time, offline/local step done during content authoring, never a
  live in-app feature (see "Handling the Unsplash API key" in
  `frontend-site-builder-supabase`'s reference doc). A live search needs
  a *real* secret (the Unsplash Access Key can call their API on the
  caller's behalf) unlike `PUBLIC_UNSPLASH_APP_NAME` (just an
  attribution label, already safe in the browser) — so it needed its own
  Edge Function (`search-unsplash`, a sibling to `publish-site`, kept
  separate since it's an unrelated concern) to hold that key
  server-side. Also implements Unsplash's required download-tracking
  ping (`links.download_location`) the moment an admin actually *picks*
  a photo, not just when it appears in search results — a compliance
  requirement of their API guidelines, not optional. Degrades gracefully
  if a client's project never gets `UNSPLASH_ACCESS_KEY` set as an Edge
  Function secret: the search button returns a clear "not configured"
  message and direct upload still works, rather than a hard error.
- **No new admin role** — management is owner/agency only, same as
  Website content, deliberately not building a narrower role for a need
  the user described as still hypothetical ("maybe we need..."). Add one
  later if a client actually asks to hand this off to specific staff.

**The Unsplash search modal and file-input button styling are shared,
not per-page copies.** Built once for Lead Magnets, then reused
immediately for `admin/blog.astro`'s hero image field rather than
copy-pasted a second time — `components/UnsplashSearchModal.astro`
(fixed ids; only one instance is ever open on a page at once, unlike
`RichTextEditor.astro`, which does need per-instance ids) is the markup,
`lib/unsplashSearch.ts`'s `initUnsplashSearchModal({ onSelect })` is the
wiring, and each consuming page decides what to do with the selected
photo. Also standardized the "Choose File" button styling here (a
visually hidden `sr-only` input — not `hidden`, which would drop it from
the tab order — paired with a styled `<label for=...>`) since the native
unstyled file input didn't read as clickable. If a third admin field
ever needs an image picker, reuse both of these rather than copying
`admin/content.astro`'s or `admin/blog.astro`'s inline pattern again.

## Lead magnet nurture sequences (built 2026-09-01)

A fixed 4-email drip — Day 0, 3, 7, and 14 after someone downloads a
lead magnet — meant to move them from "got the PDF" toward booking.
Explicitly scoped smaller than a general marketing-automation feature:
the cadence itself is hardcoded (`SEQUENCE_SCHEDULE_DAYS` in
`src/lib/nurtureSequence.ts`, duplicated in the Edge Function below since
Edge Functions are separate Deno deployables that don't share the site's
build) — only each step's subject/body is admin-editable, via 4 fixed
panels in `admin/lead-magnets.astro`'s edit view, reusing the same
rich-text-editor pattern as blog posts. A step with both subject and
body left blank is skipped (represented as no DB row, not an empty one).

- **Enrollment/progress lives directly on `leads`** (`sequence_next_step`,
  `sequence_last_sent_at`, `sequence_unsubscribed_at`,
  `0019_lead_magnet_nurture_sequences.sql`) rather than a separate join
  table — a lead can only ever be enrolled in the one sequence tied to
  their own `lead_magnet_id`, a true 1:1 relationship. Day offsets are
  always computed from the lead's original `created_at`, not from the
  previous send — so a cron run that's a few hours late on one step
  doesn't cascade delay into the rest of the schedule.
- **This needed a different sending mechanism than the SMTP setup
  above.** Supabase Auth's SMTP settings only handle *auth* emails
  (invites, password resets) — they can't send arbitrary content to a
  lead. Sending to leads goes through a new Edge Function
  (`send-nurture-emails`) that calls Resend's API directly, using its
  own separate API key (`NURTURE_RESEND_API_KEY`) — recommend verifying
  a **second, separate Resend subdomain** for this (e.g.
  `updates.yourdomain.com` vs. the auth email's `communications.
  yourdomain.com`), since marketing email naturally draws more
  unsubscribes/spam complaints than transactional auth email, and
  isolating them protects the domain admin logins depend on.
- **The first scheduled/cron-triggered Edge Function in this project —
  every prior one was request-triggered from the browser.** Scheduled
  via Supabase's Cron (Dashboard → Integrations → Cron), which is a
  manual, per-client, one-time setup step rather than something baked
  into a migration — same reason SMTP itself is manual: the Edge
  Function's URL and the secret used to authorize it are project-
  specific values that don't belong hardcoded into a portable template
  migration.
- **Real bug found while testing this, not from documentation: don't
  authorize a cron-triggered function by comparing against
  `SUPABASE_SERVICE_ROLE_KEY`.** First attempt checked the incoming
  Authorization header against `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`
  — the same pattern every other function in this project uses to *hold*
  the service_role key for its own outgoing DB client, just reused here
  to *check* an incoming caller. Deployed and tested directly (not
  assumed): calling the live function with the actual current
  service_role key still got rejected. Root cause — Supabase now issues
  both a legacy JWT-format service_role key and a newer `sb_secret_`-
  format one, and evidently the value auto-injected into an Edge
  Function's own environment doesn't reliably match whichever format a
  caller presents from outside. Fixed by using a dedicated
  `NURTURE_CRON_SECRET` (any random value) that this function alone
  owns and checks — sidesteps the format ambiguity entirely, and is
  better-scoped besides: whoever configures the Cron job never needs to
  handle the actual service_role key, just this narrower one. Requires
  `verify_jwt = false` for this function too (`supabase/config.toml`) —
  the gateway would otherwise reject the random secret before the
  function's own check ever ran, since it isn't a real Supabase-signed
  JWT.
- **Unsubscribe is a second new function, `unsubscribe-lead`** — the one
  other function in this project with `verify_jwt = false`, since it has
  to be reachable by a plain link click from inside an email client with
  no session at all. Does exactly one narrow thing (flips
  `sequence_unsubscribed_at` for the one lead ID in the URL) and returns
  a plain HTML confirmation directly, no separate public page needed.
  CAN-SPAM requires this — every nurture email includes the unsubscribe
  link plus the practice's mailing address (pulled from the existing
  `business` table fields, no new field needed) in its footer. **That
  address field being empty isn't caught by anything** — found via a
  real live send during setup, where CMC's own `business` row had no
  street address on file, so the footer silently rendered with no
  address at all. Confirm the client's real mailing address is filled in
  via Website content → Business info before this goes live for real
  leads on any client site — not a code bug, just an easy-to-miss data
  dependency.
- **A consent line on the public lead magnet form itself**
  (`LeadMagnet.astro`, next to the existing "Your privacy is important to
  us" line) — downloading a guide only implies wanting the PDF, not
  agreeing to a multi-week email series, so the form says so explicitly
  rather than silently enrolling every download.
- **Open/click tracking analytics were explicitly scoped OUT of this
  build** — backlogged for a future lead-magnet dashboard, on top of
  Resend's own webhook-based event data. Not needed to get sending
  working reliably, which was the priority here.
- **Verification pattern**: a temporary lead magnet + temporary agency
  test account to exercise the admin sequence editor end-to-end
  (4 panels round-tripped correctly; leaving Day 7/14 blank correctly
  created no rows rather than empty ones — confirmed via a direct query,
  not just the UI). The Edge Functions were tested live via direct
  `curl` calls with real and deliberately-wrong secrets (confirming both
  the accept and reject paths, not just the happy path) rather than
  waiting on an actual cron run or a real email send, since the auth
  bug above would only ever have surfaced that way. All test data
  deleted after — the lead magnet's cascade delete also correctly
  removed its sequence steps. **Once CMC's own Resend subdomain
  (`learn.counselormarketingco.com`), Edge Function secrets, and
  Supabase Cron job were actually configured**, ran the real thing
  end-to-end once more: a disposable inbox, a real lead enrolled in a
  real (temporary) magnet's sequence, the function invoked manually with
  the same header the cron job uses — confirmed actual delivery,
  correct sender/subject/body, `sequence_next_step` advancing, and the
  unsubscribe link genuinely flipping `sequence_unsubscribed_at`. This
  is what caught the missing-mailing-address gap above — a curl-only
  test of the auth logic wouldn't have surfaced it.

## Nurture email crisis-resource line (built 2026-09-06)

`business.show_crisis_resources` (boolean, `0032_crisis_resource_line.sql`)
gates a line in `send-nurture-emails`' shared footer: *"If you are in a
mental health crisis, call or text 988 to reach the Suicide & Crisis
Lifeline, available 24/7."* — the same line `Contact.astro` already
carries on every counseling-practice client site. Added after drafting a
real 4-email nurture sequence for Freedom Counseling Services and
checking it against the ACA 2014 Code of Ethics: nurture content that
legitimately discusses emotional distress (e.g. "what if it feels worse
before it feels better") had no safety-net resource in the footer the
way the site's own pages do.

- **Defaults to `true`, not an opt-in.** Every real client this template
  has been used for is a counseling/mental-health practice, where this
  is the responsible default — same reasoning as this file's other
  business-level flags defaulting to whatever the common case actually
  needs (see `collect_website_in_leads`, `collect_counselor_preference`),
  just inverted: this one defaults *on* because leaving it off by
  default is the riskier failure mode for this specific line.
- **Counselor Marketing Co.'s own site is the one real exception, and
  it must be set explicitly — it will NOT inherit correctly by
  accident.** CMC's site is built from this same template, but CMC
  itself is the marketing agency, not a counseling practice — its
  nurture emails go to prospective therapist/counselor clients asking
  about website and marketing services, not to individuals seeking
  mental health care. A crisis-line disclaimer on those emails would be
  nonsensical. `business.show_crisis_resources` was set to `false`
  directly on CMC's live `business` row — this is the one client site
  where the migration's default is deliberately wrong for that business
  and must be overridden, not left as-is. Any future non-counseling
  client built from this template needs the same explicit override.
- **Like the other business-level flags in this section, there's no
  admin UI toggle for this** — it's set once via the migration default
  or a direct per-client override, matching how `collect_website_in_leads`
  and `collect_counselor_preference` are already handled. Add an admin
  toggle only if a real client actually needs to change it themselves.
- **Not live-tested with a real send** — neither Freedom's nor CMC's
  `lead_magnets` table has an active magnet yet (the nurture sequence
  infrastructure exists but hasn't been turned on for either site), so
  this was verified by reading the Edge Function's logic and the
  rendered HTML string directly, not by triggering a real cron run.
  Verify with a real send (per this section's own established pattern
  above — disposable inbox, temporary lead, manual function invocation)
  the first time a client's nurture sequence actually goes live.

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
page). Do real keyword research around informational-intent seed terms
adjacent to the business's actual services, then group genuine, on-topic,
correctly-intent-matched results into categories. Expect to manually
filter out a lot of noise (brand names, adjacent professions, "near me"
hyper-local queries meant for a different audience than the blog's) — raw
keyword tool output is not ready-to-use data.

**Preferred tool: the Mangools MCP server**, not raw REST calls —
`claude mcp add --transport http mangools https://mcp.mangools.com/mcp
--header "x-access-token: <token>"` gives real MCP tools
(`kwfinder_search_related_keywords`, `kwfinder_get_keyword_details`,
`serpchecker_get_serp`, `siteprofiler_get_overview`/`find_competitors`,
etc.) instead of hand-rolled `curl`. Two things that aren't obvious the
first time: **adding the MCP server requires a full `claude` process
restart** (`claude --continue`/`--resume`, not just a new message in the
same session) before the new tools are visible, and the **API is rate-
limited to a few requests per short period** — pace calls, don't batch
several in a row. Falls back to the raw REST API (`GET
https://api.mangools.com/v3/kwfinder/related-keywords?kw=<seed>&location_id=2840&language_id=1000`
with the key in an `x-access-token` header) if the MCP server isn't set up
in a given environment. Location ID 2840 = United States.

**Watch for search-intent mismatches when a raw volume number looks
exciting.** A high-volume keyword cluster can be *end-client* search
volume (someone looking for a therapist for themselves) rather than
*counselor*-facing search volume (someone looking for marketing help) —
the two have completely different audiences and a blog aimed at
counselors can't target the first kind directly, no matter how large the
number is. Surface this distinction explicitly rather than presenting a
combined volume number that implies it's all directly targetable — it
isn't, and the client will (rightly) ask for the breakdown if the number
seems too good to be true. This isn't limited to Content Pillar keywords —
the same check applies to any page's `focus_keyword`, including audience-
segment pages (see "Services Overview & Who We Serve" below).

**Verification pattern**: same as the leads dashboard — build the full
mechanism (pill filtering, `?category=` pre-selection, hub↔post
cross-linking), then verify it against **temporary test posts** seeded
directly in Supabase, not the absence of testing just because there's no
real content yet. Delete the test posts after. This caught real, working
behavior with confidence before any real content existed to obscure bugs
in either direction.

## Dynamic overview/hub pages: Services, Who We Serve, Service Areas, Counselors (built 2026-09-02/03)

Real bug found in production, then generalized into two durable patterns
for how a Service Page grid gets built and organized.

- **A grid driven by a manually-curated list goes stale.** Services
  Overview originally filtered a page-level `internal_links` array to
  build its grid — a new Service Page (Google Ads for Therapists) went
  live and never appeared there because nobody remembered to add its slug
  to that list. Fixed by adding `pages.service_group` (`'deliverable' |
  'segment'`, `0020_service_page_groups.sql`) — the template filters
  `page_type = 'Service Page' AND service_group = 'X'` directly, so a new
  Service Page with a group set shows up automatically. Reuse this same
  self-maintaining pattern (a real column the template filters on, never
  a page-level curated list) for any future grid that's supposed to grow
  as pages are added — this is the same fix already applied once before
  to the hub-and-spoke category system, now applied here too.
- **Deliverables and audience-segment pages are two different things and
  belong on two different pages.** A page like "Solo Practice Marketing"
  or "Psychologist Marketing" isn't a distinct service — it's the same
  core services (Website Design, SEO, Google Ads, Full-Service), tailored
  and priced for a specific kind of practice. Mixing these into the
  Services grid blurs "what's actually being sold" against "who it's
  built for," and gets worse as segment pages accumulate.
  `service_group = 'deliverable'` pages stay on Services Overview;
  `service_group = 'segment'` pages get a new, dedicated **`Who We
  Serve`** page_type (`WhoWeServe.astro`, wired into `[...slug].astro`'s
  `templateByType` map same as any other page_type,
  `0021_who_we_serve_page_type.sql`) — same self-maintaining grid
  mechanism as Services Overview, just filtered to `service_group =
  'segment'`. Give any future client's audience-specific pages (by
  practice type, by client population, by specialty — whatever the real
  segmentation turns out to be for that business) this same treatment
  rather than cramming them into the Services grid or inventing a one-off
  page structure per client.
- **Nav placement for both pages is fully data-driven** off
  `nav_placement`/`nav_order`/`parent_page_id` (see `Header.astro`) —
  adding the "Who We Serve" nav item and reparenting the segment pages
  under it required zero nav code changes, only correct CMS field values
  on the new page row and on each reparented page. Already true for
  Services Overview and the hub-and-spoke blog categories; worth
  remembering before assuming a new top-level nav section needs code.
- **A segment page's own focus keyword rarely has real search volume, and
  that's fine.** These are conversion/positioning pages for someone
  already on the site, referred in, or navigating from Who We Serve — not
  organic-traffic-driving pages the way a Content Pillar is. Confirmed
  live via Mangools on more than one segment page's keyword coming back
  with zero measurable search volume. Don't chase volume here or force an
  artificial exact-match keyword to try to manufacture some — pick the
  accurate label for what the page actually is and move on. (The same
  intent-mismatch check from the Hub-and-spoke section above still
  applies to the *obvious* alternative keyword, though — a segment page's
  natural-sounding client-facing phrase can carry real volume that
  belongs to the wrong audience entirely.)
- **The same pattern applies a third time for multi-region businesses**:
  `Service Areas Overview` (`0022_service_areas_overview_page_type.sql`,
  `ServiceAreasOverview.astro`) is the same dynamic-grid landing page,
  filtered to `page_type = 'Service Area'` directly — no extra grouping
  column needed here, since `Service Area` is already an unambiguous type
  on its own (unlike `Service Page`, which needed `service_group` to tell
  deliverables and segments apart). Only worth building for a business
  that genuinely serves more than one distinct area (e.g. a physical
  office in one metro plus telehealth coverage of a second, separate
  region) — a single-area business just puts its one Service Area page
  straight in nav, no overview page needed. First built for Freedom
  Counseling Services (Louisville, KY office + Southern Indiana
  telehealth coverage).
- **A fourth instance, for a "meet the team" page**: `Counselors
  Overview` (`0025_counselors_overview_page_type.sql`,
  `CounselorsOverview.astro`) — same pattern again, filtered to
  `page_type = 'Counselor Profile'`. Only worth building for a group
  practice with more than one counselor; a solo practice's one bio just
  goes on the About page. First built for Freedom Counseling Services
  (5 counselors).

## Service Hub: a bookable service that's also a content hub (built 2026-09-03)

A distinct `Service Hub` page type (`ServiceHub.astro`,
`0024_service_hub_page_type.sql`) for a client whose real services are
*simultaneously* something you book and something people research
extensively — first built for Freedom Counseling Services, whose 8
services (Individual, Couples & Marriage, Family, Child & Teen,
Christian/Faith-Based, Grief, Anxiety & Depression, Trauma & EMDR) are
each a real, bookable offering *and* a genuine topic with real search
demand behind it, not a narrow transactional thing the way CMC's own
services (Website Design, SEO) are.

- **Deliberately a distinct `page_type`, not a reuse of `Content
  Pillar`.** The underlying mechanics are identical (TOC, deep FAQ,
  category-driven spoke posts via `BlogPreview`, the Reviewed-by byline,
  related links) — the reason for a separate type is that the CMS should
  make "this is also a real bookable service" explicit, not leave it
  implicit in a generic pillar row. `Content Pillar` stays for pages
  that are genuinely just broad educational content and never a
  service you'd book directly (CMC's own Therapist Branding, SEO &
  Marketing, Practice Growth pillars) — don't convert those to Service
  Hub just because the template *could* render them.
- **`ServiceHub.astro` = `ContentPillar.astro`'s full feature set, plus
  `PlanSteps` and a Hero CTA button** (`ctaText`, same as
  `ServicePage.astro`) — the "bookable" half. Real precedent for the
  merge: Freedom's own existing Christian/Faith-Based Counseling page
  already had a TOC, deep FAQ, and a blog cross-link *and* a "Start
  Counseling" CTA button in the hero — this template just formalizes a
  pattern the client had already arrived at in practice, not something
  invented from scratch.
- **The Reviewed-by byline (see its own section above) applies to
  `Service Hub` pages too**, not just `Content Pillar` — both are
  "pillar/hub" page types for that feature's purposes.
  `admin/content.astro`'s `BYLINE_PAGE_TYPES` array is what gates this;
  add any future pillar-shaped page type to that array too, don't
  assume it only ever needs to check for `Content Pillar`.
- **When to reach for this vs. plain `Service Page`**: if a future
  client's services are narrow and transactional (most B2B/agency
  services, most home-services trades — "Website Design," "gutter
  cleaning") stay `Service Page`. If they're the kind of thing a real
  person researches at length before booking — most clinical/healthcare
  specialties, most things where the "service" and "topic" are the same
  concept — `Service Hub` is very likely the right call. Decide this
  explicitly per client at Phase 1 (site-structure-planner-supabase),
  not by default.

## Counselor Profile header card + self-service settings (built 2026-09-04, revised same day)

A card-style header for `CounselorProfile.astro` — headshot, name (stays
the real H1), credentials, a one-line "who they help" summary, an
availability-status pill, a telehealth pill, clickable specialty pills,
and an in-card CTA button — plus a more prominent personal-quote block
and a dynamic "Training & Modalities" section, replacing a plain
photo/name block with everything else buried as flat markdown in `copy`.
First built for Freedom Counseling Services (5 counselors); generic
template feature since any future group-practice client has the same
shape. Revised same day after seeing it live: wider card (`max-w-5xl`,
spans the page's content width, not `max-w-3xl`), bigger headshot
(`h-56 w-56`, was `h-32 w-32`), specialty pills moved *into* the card
(were their own section below the quote), a telehealth pill, and an
in-card CTA — client feedback, working from a reference screenshot of a
comparable real counseling-site card.

- **Three fields moved out of `copy` into structured columns, same
  "pull it out, don't render it twice" discipline as `plan_steps`/
  `faqs`/`concerns`.** The "who they help" one-liner reuses
  `hero_subhead` (already existed, unused on this template — no
  migration). The personal quote reuses `testimonial_quote`/
  `testimonial_author` (same reasoning — already existed, unused here).
  Specialties needed a genuinely new column, `pages.specialties jsonb`
  (`{label, page_slug}[]`, `0028_counselor_card.sql`) — a flat
  `"**Specialties:** A, B, C"` string can't carry a real link, so each
  specialty needs an explicit slug.
- **A specialty pill only links when a real, accurate matching page
  exists — `page_slug` is null otherwise, and `SpecialtyPills.astro`
  renders those as plain, non-clickable text.** Several of Freedom's
  real specialty labels (Men's Counseling, Perfectionism, Identity,
  Women's Counseling, OCD & Intrusive Thoughts) don't map to any of the
  8 real Service Hub pages — never force an inaccurate link just to make
  every pill clickable.
- **Specialty pills live inside the header card now (v2), not their own
  section below the quote.** `SpecialtyPills.astro` itself didn't need a
  structural change — just a background swap (`bg-white` → `bg-brand-
  neutral`, the page's own cream token) so the pills stay visually
  distinct sitting on the card's white background instead of the page's
  cream one, and a `sm:justify-start` so they left-align under the name
  on desktop instead of always centering.
- **The header card gained an in-card CTA button** (v2) — reuses
  `page.cta_button_text` (falls back to `'Start Counseling'`, the same
  fallback `ServiceHub.astro`'s Hero CTA uses), linking to `#lead-
  generator`. That id already exists on `LeadGenerator.astro`'s outer
  `<section>` whenever it's rendered non-`embedded` (the default, and
  what every template including this one uses) — no new anchor/id
  needed, just point at what was already there.
- **`Modalities.astro` is a new, separate component from
  `SpecialtyPills.astro`, not a reuse** — modalities are plain tags
  ("EMDR", "ACT") that don't link anywhere, unlike a specialty's
  `{label, page_slug}` shape, and they render as their own H2-headed
  section ("Training & Modalities") below the personal quote rather than
  inside the hero card, so a long modality list doesn't compete with the
  card's already-busy layout (photo, name, credentials, telehealth pill,
  bio, specialties, CTA). Muted tag styling (`bg-brand-tint/40`, no
  border/hover) deliberately reads as informational, not interactive —
  the opposite intent from `SpecialtyPills.astro`'s clickable ones.
  Renders nothing when `modalities` is empty, same never-invent
  discipline as everything else on this card.
- **The quote gets its own component, `CounselorQuote.astro`, not
  `Testimonial.astro`.** `Testimonial.astro`'s full-bleed tinted band is
  reserved for genuine third-party client testimonials elsewhere on the
  site (ServiceArea, etc.) — reusing its exact treatment for a
  counselor's own words about themselves would blur "a client said this"
  with "this is the counselor's own philosophy." `CounselorQuote.astro`
  borrows the same visual language (large decorative accent quote mark,
  centered Fraunces) but as a bordered card, italic, no tint band.
  **Its decorative quote mark means the stored `testimonial_quote` text
  should NOT include literal `"..."` characters** — unlike this site's
  usual blockquote-in-copy convention (see the Group C pull-quote
  entries in the real-bugs list above), this component supplies its own
  visual quote mark, so a literal quote in the stored text would double
  up.
- **`availability_status` (`'accepting' | 'almost_full' | 'not_accepting'
  | null`) is never defaulted or guessed** — null renders no pill at all
  (`StatusPill.astro`), matching this project's standing rule against
  inventing content. Colors are real semantic red/amber/green (Tailwind's
  light 50-level shades, not brand tokens or full-saturation 500/600) —
  a status indicator needs to read as universally red/yellow/green
  regardless of a given client's palette, and "subtle, not full opacity"
  was an explicit design ask. Same never-invent discipline extended to
  the two v2 additions: `telehealth_available` (`0029_counselor_card_v2
  .sql`) defaults `false` (no pill) rather than assuming every counselor
  offers it, and `modalities` (`jsonb`, plain string tags — "EMDR",
  "ACT", not a `{label, page_slug}` shape like specialties, since these
  don't link anywhere) defaults `'[]'` — `Modalities.astro` renders
  nothing, not an empty section, until real tags exist. All three are
  self-service fields a counselor sets themselves, not agency-populated
  defaults.
- **`StatusPill.astro` is an overlay badge on the headshot, not an inline
  label next to credentials** (v2 revision) — `CounselorProfile.astro`
  wraps the image in a `relative` container and absolutely-positions the
  pill at the bottom-left corner, `shadow-sm` so it stays legible over a
  photo of any color/brightness. Gained a small solid color dot
  (`h-1.5 w-1.5 rounded-full`) ahead of the label text, matching the
  reference screenshot's at-a-glance scannability — the component itself
  stays position-agnostic (just renders the pill), so a future template
  that wants it inline instead isn't fighting baked-in `absolute`
  classes.
- **Self-service editing needed a real, narrow extension to the RLS/role
  system, not a new admin role.** A counselor should be able to update
  their own status pill without going through the practice owner, but a
  4th role (`'counselor'`, touching only this one field) would have meant
  threading a new role value through every existing `is_owner()`/
  `is_agency()`-style check for a single-field permission. Instead:
  `admin_users.linked_counselor_page_id` (nullable FK to `pages`) links
  an existing `'staff'` login to one Counselor Profile page. A new,
  narrow UPDATE policy (`"linked counselor can update own page"`) grants
  that login row-level access to only their own linked page — and
  `enforce_content_permission()` (the same trigger from the content-tier
  system) gained an early, separate branch: a linked-counselor caller who
  isn't owner/agency may change `availability_status`,
  `telehealth_available`, and `modalities` (the v2 additions folded into
  the same carve-out — `0029_counselor_card_v2.sql`) and *nothing else*
  on that row, checked via `to_jsonb(new) - 'availability_status' -
  'telehealth_available' - 'modalities' is distinct from the same diff on
  `old`` rather than hand-enumerating every other column (robust against
  future columns for free — adding a 4th self-service field later is
  just one more subtracted key on both sides). This is stricter than what
  a full-tier owner can touch — a linked counselor can't edit their own
  `hero_subhead`/`copy` even though an owner on the full plan could.
  - A linked-counselor login incidentally keeps the blog-authoring access
    `'staff'` already has — deliberate, not an oversight: building an
    even narrower "status-only, no blog" role for a need that was purely
    hypothetical would repeat the mistake this file already warns
    against elsewhere (see Lead Magnets' "No new admin role" note).
- **`admin/counselor-settings.astro`** (renamed from `admin/
  availability.astro` the same day, before any real counselor had been
  invited — the page grew a telehealth checkbox and a comma-separated
  modalities text input alongside the original 3-way status radio, so
  the old name undersold what it does) serves both audiences on one
  screen: owner/agency get a page picker across every Counselor Profile
  page (same pattern as Testimonials' page picker on `admin/content
  .astro`); a linked-counselor staff login sees only their own page, no
  picker — and a staff login with no link sees a plain "ask the owner to
  link one" notice rather than a broken empty form. RLS is still the
  real boundary regardless of what the UI shows (same discipline as
  every other role-gated screen in this app). Modalities is a plain
  comma-separated text field ("EMDR, ACT, CBT"), not a repeatable-row
  tag-input widget — proportionate for a handful of short tags, same
  "don't build UI complexity a form field doesn't need" call as
  everywhere else in this admin.
- **A linked counselor is redirected straight to Counselor settings the
  moment they log in** — but only right then, not on every later page
  load. `adminAuth.ts`'s `tryShowAuthed()` takes an `isFreshLogin`
  parameter, `true` only from the login-form and set-password-form
  submit handlers (the two places an actual "login" happens), `false`
  from the plain existing-session check every `/admin/*` page runs on
  load. A blanket redirect-on-every-load would have also bounced a
  linked counselor off `/admin/blog` on a simple page refresh, fighting
  the fact `'staff'` keeps its normal blog access — this only fires at
  the moment of authenticating, exactly matching "upon login, bring them
  to their settings" without trapping them there afterward.
- **`admin/team.astro`'s invite form gained an optional "Link to
  counselor page" picker**, shown only when inviting role `staff`,
  offering only Counselor Profile pages not already linked to another
  staff login (one counselor, one login). The value is threaded through
  `publish-site`'s `invite` action (a new `linkedCounselorPageId` field
  on the request, inserted as `admin_users.linked_counselor_page_id`)
  and preserved across a `resend` (the reinsert now also copies the
  original row's link, not just role/email).
- **Nav visibility for "Counselor settings" is role-based (owner/agency,
  always) *plus* conditional for staff** — `adminAuth.ts`'s
  `applyNavAccess()` takes the full `AdminUser`, not just its role, so it
  can add `'counselor-settings'` for a staff login whose
  `linked_counselor_page_id` is set, on top of the static per-role list.
  Any future nav item that depends on more than just role needs the same
  shape, not a second hard-coded role map.

## Hero overlay style (built 2026-09-04)

A second `Hero.astro` layout — full-bleed background image with a
tintable color/opacity overlay for legibility, H1/subhead on top of it,
and (when the page has one) its `aside` form rendered as a frosted-glass
card beside the text instead of the default side-by-side image/form
split. First requested for Freedom Counseling Services' homepage, from a
reference screenshot of a comparable real site; built as a real per-page
opt-in rather than hardcoded to Homepage, since nothing about the layout
is homepage-specific.

- **`pages.hero_style` (`'default' | 'overlay'`, `0030_hero_overlay_style
  .sql`), defaulting to `'default'`** — every existing page on every
  existing client site keeps today's exact layout unless a page
  explicitly opts in. **Never available on `'Counselor Profile'` pages**
  — that page type doesn't use `Hero.astro` at all (it has its own
  header card; see the Counselor Profile header card section above), so
  `admin/content.astro` hides the whole "Hero layout" control block for
  that `page_type` rather than showing a setting with no effect.
- **`hero_overlay_color`/`hero_overlay_opacity` get real DB defaults** (a
  dark neutral tint at 50%), not left null — this is a technical
  rendering default, not invented business content, so a page is fine to
  inherit it without an admin ever having touched it; a `<input
  type="color">` + `<input type="range">` pair in `admin/content.astro`
  let an admin tune both live once "Full-width image with color overlay"
  is selected.
- **`Hero.astro`'s overlay mode only actually renders once a real image
  is on file** — `isOverlay = style === 'overlay' && !!imageUrl`. A page
  that picked the overlay style but hasn't set a hero image yet falls
  back to the plain default layout rather than showing a broken empty
  tinted band; `Homepage.astro` computes the identical condition once
  itself (`isOverlayHero`) so the aside form's field set/styling can't
  drift out of sync with what `Hero.astro` actually decides to render.
- **The image and the `aside` slot were mutually exclusive before this
  (`showAside = !imageUrl && Astro.slots.has('aside')`) — overlay mode
  needed both at once**, so `Hero.astro` now branches into two full
  layouts (`isOverlay ? (...) : (...)`) rather than trying to thread one
  shared markup block through both cases; the default layout's markup is
  untouched, copy-pasted as-is into its own branch, specifically so
  nothing about existing pages' rendering could regress from
  restructuring the conditionals around it.
- **No separate CTA button when the form is already visible, in either
  layout** — overlay mode reuses the exact same `showAside`-based
  suppression the default layout already had (`ctaText && !showAside`),
  not a new rule. The form itself is the CTA, per the original ask.
- **`LeadGenerator.astro`'s `embedded` prop used to conflate two
  different things: card-vs-section wrapper styling, and which fields
  show (phone/message dropped).** The overlay style's reference
  screenshot wanted a card (not a full-width section) that *still* shows
  every field — a combination the old single `embedded` boolean couldn't
  express. Split into `embedded` (wrapper/tag only) and a new `compact`
  prop (field set only, `compact = embedded` by default so every
  existing call site keeps its exact current behavior without being
  touched) plus a new `frosted` prop (translucent `bg-white/70
  backdrop-blur-md` card instead of solid white, only meaningful when
  `embedded` is true). `Homepage.astro` passes `compact={!isOverlayHero}
  frosted={isOverlayHero}` — default style unchanged, overlay style gets
  the full-fields frosted card.
- **Two full-fields forms on one homepage (hero + bottom-of-page) is not
  an SEO or duplicate-content issue** — raised directly by the client
  before building this. Google's duplicate-content signals concern
  substantive *text* content duplicated across separate URLs, not a UI
  widget repeated within a single page; this is a normal, common
  conversion pattern (top for quick converters, bottom for scrollers).
  The one real technical trap — two forms sharing an `id` — was already
  avoided years earlier in this project (`LeadGenerator.astro` uses
  `.lead-form`/`querySelectorAll`, not `getElementById`, specifically
  because it can render more than once per page; see the real-bugs list
  above).
- **`admin/content.astro`'s hero image field only ever supported direct
  upload — no Unsplash search**, unlike `admin/blog.astro` and
  `admin/lead-magnets.astro`. Fixed as part of this pass (needed either
  way, since the overlay style leans on the hero image existing and
  looking good) by wiring in the same shared `UnsplashSearchModal.astro`
  + `initUnsplashSearchModal()` pattern — the third reuse of that pair,
  exactly what its own code comment anticipated. **Its trigger button's
  id is hardcoded (`search-unsplash-button`) inside `initUnsplashSearchModal`
  itself, not parameterized** — reusing it means the button must use
  that exact id, not a page-specific one; got this wrong on the first
  pass (used a prefixed id) and the modal silently never opened until
  fixed.
- **A quieter, second real bug on the same field, same shape as this
  file's other "populated but not rendered" entries**: `admin/content
  .astro`'s image save payload only ever wrote `{ url, alt }` — never
  `creditName`/`creditUrl` — even though `ImageSlot` has always supported
  them and `OptimizedImage.astro` has always rendered the attribution
  link when present. Any hero image ever selected through this admin
  screen (as opposed to seeded directly via SQL/REST) would have silently
  lost its Unsplash attribution on save. Fixed alongside adding the
  search picker, tracking `uploadedImageCreditName`/`uploadedImageCreditUrl`
  the same way `admin/blog.astro` already does and including them in the
  saved `images.hero` object whenever both are present.
- **`hero_style`/`hero_overlay_color`/`hero_overlay_opacity` had to be
  added to `enforce_content_permission()`'s existing hero_subhead/copy/
  images tier check, not left ungated** — the admin UI bundles them
  under the same "Hero image" field group (a hero layout choice is
  closely tied to the hero image itself) for a restricted-tier owner,
  but that grouping is only real if the *trigger* enforces it too; the
  UI hiding a control is not enforcement on its own (see this file's
  standing rule on that, established back in Phase 4's original
  content-permission work). Caught and fixed before deploying, not after
  — before, this would have been silent UI-only theater, exactly the gap
  this trigger exists to close everywhere else.

## Hero image focal point (built 2026-09-05)

`pages.hero_image_focal_y` (`'top' | 'center' | 'bottom'`, default
`'center'`, `0031_hero_image_focal_point.sql`) biases `Hero.astro`'s
`object-fit: cover` crop toward the top or bottom of the source photo,
mapped straight to Tailwind's `object-top`/`object-center`/`object-bottom`
utilities. Applies in both Hero layouts (default and overlay) — it's a
property of the image, not the layout choice.

- **The real bug this fixes isn't "the crop isn't centered" — it already
  was.** A plain centered crop centers on the *frame*, not the *subject*.
  Found on Freedom Counseling Services' real homepage hero photo: a
  father carrying his son on his shoulders, composed with the subjects in
  the lower two-thirds of the frame and a large empty sky filling the top
  third (a normal, deliberate photographic composition choice — headroom,
  rule-of-thirds). A frame-centered crop under `object-fit: cover`
  removes equal amounts top and bottom *of the frame*, which on this
  photo means clipping into the subjects while barely touching the empty
  sky — exactly the "subject too far down, bottom clipped" symptom the
  client reported. No CSS default fixes this, because the browser has no
  way to know where the subject actually is; only a per-image adjustment
  can.
- **A per-page setting, not a one-off fix for this one photo** — any
  future client's photo with an off-center subject hits the identical
  problem, and demanding "only pick photos with the subject exactly
  centered" is an unreasonable constraint on real photography. Same
  reasoning as the overlay color/opacity controls: build the reusable
  capability once a real instance of the problem shows up, rather than
  patching the one client.
- **Added to `enforce_content_permission()`'s tier-gated group from the
  start**, not as a follow-up fix — `hero_overlay_color`/
  `hero_overlay_opacity`/`hero_style` needed a follow-up commit for this
  exact thing the day before (see "Hero overlay style" above); the fix
  there was to remember it this time, not repeat the gap.
- **`admin/content.astro`'s "Image focal point" selector sits next to
  "Hero layout"**, inside the same `#content-hero-style-wrap` block —
  same visibility rule (hidden entirely for `Counselor Profile` pages,
  which don't use `Hero.astro`) and same tier-gating, since it's edited
  in the same place as the image itself. Plain-language option labels
  ("Keep the top of the photo visible" / "Keep the bottom of the photo
  visible"), not CSS terminology — a non-technical client needs to
  reason about "which part of my photo matters," not `object-position`
  keyword semantics, which are easy to get backwards even for someone
  who does know CSS (`object-position: bottom` keeps the *bottom* of the
  image visible by cropping the *top* — the option label says the effect
  directly rather than the mechanism).

## Real webfont loading is data-driven, not a per-client file edit (`business.google_fonts_url`, built 2026-09-07)

`BaseLayout.astro` used to have no webfont loading at all — the two real
clients built on this template so far (Counselor Marketing Co., Freedom
Counseling Services) each independently hand-wrote the same `<link
rel="preconnect">`/font `<link>` pair straight into their own copy of
`BaseLayout.astro` to load their real brand font(s), since the template's
placeholder version relies on the OS system-font fallback. Same few lines,
reinvented per client, on a file that's otherwise meant to be identical
across every site (see the real-bugs list's `OptimizedImage.astro` entry
for what happens when a real template fix can't reach a client repo whose
copy of a file has silently diverged for an unrelated reason — this was
the same shape of problem, just self-inflicted instead of a missed sync).

- **`business.google_fonts_url`** (nullable `text`,
  `0033_google_fonts_url.sql`) holds the exact Google Fonts CSS2 URL
  (`https://fonts.googleapis.com/css2?family=...&display=swap`) for a
  client's real brand font(s) — set once during the design-direction phase,
  alongside `brand_colors`/`brand_fonts`, the same way as any other content
  write (service_role key, see `supabase-technical-setup.md`). `null` means
  no webfont — falls back to the OS system font, same as any other unset
  optional field.
- **Storing the full URL rather than deriving one from `brand_fonts`'s font
  names** sidesteps encoding which weights/optical sizes each client's
  fonts actually need, which is exactly what varies client to client (CMC:
  `Inter:wght@400;500;600;700;800;900` alone; Freedom Counseling:
  `Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600` paired with the
  same Inter weights) — a derived-from-name approach would need its own
  per-font weight table for no real benefit over just storing the URL a
  human already has after picking the fonts on Google Fonts.
- **`BaseLayout.astro` now needs zero per-client changes for fonts** —
  it renders the preconnect + stylesheet tags itself whenever
  `business.google_fonts_url` is set. This closes off font loading as a
  source of future per-client `BaseLayout.astro` drift; `global.css`'s
  `@theme` color tokens remain the one genuine, intentional per-client
  divergence in this file's file-level exclusion from a future template
  `rsync`.
- **CMC and Freedom Counseling's own hand-written font `<link>` tags were
  removed from their `BaseLayout.astro` copies and replaced by setting
  `google_fonts_url` on their `business` row instead** — both sites now
  match the template's `BaseLayout.astro` byte-for-byte, verified via
  `diff`, not just "looks the same" from the rendered page.

## StoryBrand section-by-section copy editing (built 2026-09-07)

`admin/content/page-copy.astro`'s single flowing "Page copy" box is now
split into 5 separate StoryBrand fields for the 3 page types short/compact
enough that the whole page is basically one pass through the StoryBrand
arc — `Homepage`, `Service Page`, `Counselor Profile`
(`STORYBRAND_SPLIT_PAGE_TYPES`, `src/lib/pages.ts`) — so a client can
change just the section that needs changing instead of hunting through
one long text field. Each field ships with real instructional copy (in
`RichTextEditor`'s `helpText` prop) explaining what StoryBrand part it
maps to and what to actually write there, sourced from
`storybrand-framework.md`'s own elicitation questions but rewritten for
someone filling out a form, not a copywriter.

- **`Content Pillar` and `Service Hub` were deliberately excluded**, even
  though `page-types.md` calls both "Full tier" alongside the 3 split
  types. Both are long-form (1,800+ words), TOC-organized informational
  content — forcing a rigid 5-beat sales narrative onto that shape risks
  reading as promotional rather than helpful, a real SEO/E-E-A-T risk for
  pages meant to rank on informational intent, not just a style
  preference. Confirmed this wasn't a guess: queried both live client
  sites directly — Freedom Counseling (a real counseling practice) has
  **zero** `Service Page` or `Content Pillar` rows at all; every one of
  its 8 real service pages is `Service Hub`. CMC (a non-counseling
  business) has the opposite pattern — real `Service Page` and `Content
  Pillar` rows, zero `Service Hub`. `Service Hub` **is** `Content
  Pillar`'s full feature set plus a few bolted-on conversion pieces (see
  its own section above), so the same reasoning against splitting
  `Content Pillar` applies to it directly.
- **The 5 fields map onto the 4 wireframe sections in
  `storybrand-framework.md` that didn't already have a dedicated
  column** — Plan already has `plan_steps`, Guide's Authority already has
  `testimonial_quote`/`concerns`, the Direct CTA already has
  `cta_heading`/`cta_button_text`:
  - `storybrand_problem` ("The Problem") → wireframe section 3
    (Stakes/Problem)
  - `storybrand_guide_empathy` ("We Understand") → wireframe section 4's
    Empathy **and** Authority halves combined — the original wireframe
    bundles Empathy + Authority into one "Guide" section, so credential/
    case-study/"I built X" proof belongs here too, not split out
  - `storybrand_pitch` ("The Full Picture") → wireframe section 6
    (Explanatory paragraph)
  - `storybrand_success` ("What's Possible") → wireframe section 7
    (Success vision)
  - `storybrand_failure` ("Why It's Worth Acting Now") → wireframe
    section 8 (Failure/stakes reminder)
- **Joins the same tier-gated group as `hero_subhead`/`copy`/`images`** in
  `enforce_content_permission()` (`0034_storybrand_sections.sql`) — these
  5 columns carry the same brand-voice/SEO-sensitive narrative content
  `copy` used to carry for these page types, so they need the same
  server-side enforcement, added from the start rather than as a
  follow-up fix (see the hero-overlay/focal-point sections above for what
  happens when this step gets missed).
- **Homepage/ServicePage/CounselorProfile.astro render each field as its
  own conditional `<Section>`**, only when that field has content — no
  default heading is forced (matching how `copy` never had one either),
  so a copywriter's own `##`/`###` headings inside the field carry
  through exactly as before. `plan_steps`/`FAQ`/`Testimonial`/
  `FeatureGrid`/`CTA` stay in their existing template positions relative
  to the 5 new sections (Problem → Guide Empathy → existing Authority
  elements → Plan → Pitch → Success → Failure → FAQ → CTA).
- **"Additional page elements" — plan_steps/faqs/concerns/cta_heading/
  cta_button_text are now editable in the admin for the first time**,
  built in the same pass since they were a real, glaring gap found while
  building this: all 5 columns already existed and were already rendered
  by the public templates, but **no admin screen had ever exposed any of
  them** — only the agency could set them, directly via Supabase. Not
  tier-gated (same "safe on every tier" category as Testimonials — none
  of these 5 columns are in `enforce_content_permission()`'s check), so
  this gets its own always-on save button, shown per-page-type via
  `PLAN_STEPS_PAGE_TYPES`/`FAQS_PAGE_TYPES`/`CONCERNS_PAGE_TYPES`/
  `CTA_PAGE_TYPES` in `page-copy.astro` — **sourced by grepping every
  `src/templates/*.astro` file for these exact column names, not derived
  from `page-templates.md`**, since that doc had already drifted from
  the actual code on at least one of these (it doesn't mention `Content
  Pillar` rendering `FAQ`, even though the real-bugs list above documents
  that fix landing). A generic `createItemListEditor()` factory (add/
  remove/collect rows) is instantiated 3 times for `plan_steps`/`faqs`/
  `concerns` rather than hand-rolling near-identical markup/JS 3 times.
- **Existing live content on both Freedom and CMC was migrated by hand,
  not auto-split** — read every existing `Homepage`/`Service Page`/
  `Counselor Profile` row's `copy` (6 pages on Freedom, 9 on CMC) and
  manually re-distributed each real paragraph into whichever of the 5
  fields it actually matched, using a consistent rule (diagnostic "why
  generic X doesn't work" content → Problem; genuine customer-psychology/
  understanding content and any credential/case-study proof → Guide
  Empathy; concrete deliverables/approach explanation → Pitch), rather
  than attempting any automatic paragraph-splitting heuristic. **Left a
  field genuinely blank rather than inventing content to fill it** — several
  pages on both sites have no distinct Success-vision or Failure-stakes
  paragraph in their original copy, and those fields were left null
  rather than fabricated. Freedom's `Website Design` page's "What happens
  next" paragraph had an explicit "first... then... then..." sequence
  clean enough to extract into real `plan_steps` data instead of leaving
  it as flowing prose — this is the only page where prose was restructured
  into a new structured field during migration; every other page's
  `plan_steps`/`faqs`/`concerns` were left exactly as they already were
  (mostly empty, since nothing had ever populated them before this pass).
  `copy` was set to `null` on every migrated page once split, rather than
  left as stale, unread duplicate content.
- **`webpage-copywriter`'s `storybrand-framework.md`/`page-types.md`/
  `SKILL.md` and `site-structure-planner-supabase`'s Content Sync step
  were all updated in the same pass** so future pages get authored
  directly into these 5 fields instead of one blob — `copy.md` for these
  3 types now gets written as 5 clearly `##`-labeled sections in a fixed
  order, and Content Sync splits them into the matching columns
  (`storybrand_problem`/`storybrand_guide_empathy`/`storybrand_pitch`/
  `storybrand_success`/`storybrand_failure`), leaving `copy` itself
  `null` for these 3 types.

**Backlogged, not yet decided (raised 2026-09-07, user wants to think it
over before committing)**: a per-section **visual layout selector** —
for each of the 5 StoryBrand fields (plus `hero_style`, retrofitted into
the same picker UI instead of its current plain `<select>`), let the
editor choose from a few named layout options, each shown as a small
wireframe-style preview (not a real mockup) rather than a bare text
label. Key decisions worked through in that conversation, to pick back
up when this gets built:

- **One small shared library of layout archetypes, not 6 independent
  option sets per section.** Proposed starting set: "Plain" (today's
  centered/left-aligned text — the default), "Split" (text beside a
  supporting visual element), "Callout" (text inside a bordered/tinted
  emphasis block), "Accent" (text beside an oversized pull-quote-style
  element). Every section (Hero included) picks from this same set —
  cheaper to build than bespoke options per section, and more
  consistent with "visual rhyming" (`counseling-website-designer`'s own
  core technique — see below) than 6 different vocabularies would be.
- **Deliberately motif-agnostic wireframes, not accurate per-client
  previews.** `counseling-website-designer` (the standalone design-brief
  skill, `~/.claude/skills/counseling-website-designer/`) produces one
  *bespoke* visual system per client — 4 curated systems, each with its
  own signature motif (an arch, a rule+eyebrow, an organic blob, circular
  frames) meant to recur in every hero/section-intro/card/divider on that
  specific site. A wireframe preview that's fully accurate to a given
  motif would need its own version per system (4x the build for every
  layout option) — recommended instead: generic composition-only
  wireframes (box/text arrangement, no arch shapes or blobs baked in),
  letting each site's own CSS render the actual brand skin on top. Real
  tradeoff (less preview fidelity) accepted deliberately for buildability
  — revisit only if a client's actual motif turns out to matter enough
  in practice that generic previews feel misleading.
- **Recommended v1 stays photo-free.** None of the 5 StoryBrand fields
  have an image slot today — a "Split" archetype needing a real photo
  per section means 5 new image uploads per page on top of the hero
  photo, which is a real burden to ask of an already-busy client. Treat
  an image-inclusive variant as a later addition only if there's real
  demand, not a v1 requirement.
- **Per-page, not site-wide** — different pages' Problem sections
  genuinely vary in length/shape even within one page type, and a rigid
  sitewide layout can look awkward on an outlier page. Keep the option
  set small (3-4, not 8) so any per-page combination still reads as one
  family, protecting the "recurring pattern" that visual rhyming depends
  on even with per-page variation allowed.
- **Tier-gate it the same as the other copy fields** (agency always,
  full-tier owner otherwise) rather than exposing it on every plan — a
  restricted-tier client casually flipping layouts without design
  judgment could hurt visual consistency more than a copy edit would.
- **Content Pillar/Service Hub stay out of scope** — both have only one
  flowing `copy` field, no discrete sections to attach a layout choice
  to.
- Still open when this gets picked back up: does the proposed 4-archetype
  set actually hold up, and is tier-gating + per-page + photo-free all
  still the right call once there's a concrete UI to react to.

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
  schema markup (`references/schema-markup.md`), page templates
  (`references/page-templates.md`), image handling
  (`references/supabase-technical-setup.md`), deploy.

README.md covers one-time mechanical setup for a new client (repo
creation, Supabase project, secrets, Pages config) — this file doesn't
repeat that.

**Standing habit, not a one-time cleanup**: whenever a template-level
change lands here (a new page type, a new/changed component, a new
`Hero`/`LeadGenerator` prop, a schema mapping change), update the
relevant `frontend-site-builder-supabase` reference file(s) in the same
pass, not just this file. CLAUDE.md answers "why" and "don't regress
this" for changes already made on a specific client; `page-templates.md`
and `schema-markup.md` are the actual build spec a *future* client site
works from — they'd been allowed to drift for several real features
(`Service Hub`, `Who We Serve`, `Service Areas Overview`, `Counselors
Overview`, and the entire Counselor Profile header card had gone
undocumented there before this note was added) before this was caught
and fixed in one pass. Treat "did I update CLAUDE.md" and "did I update
the relevant reference file(s)" as the same checklist item, not two
separate, easily-forgotten ones — a change that only lands in CLAUDE.md
is only half-documented.
