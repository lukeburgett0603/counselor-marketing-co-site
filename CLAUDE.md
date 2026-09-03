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

## Dynamic overview/hub pages: Services, Who We Serve, Service Areas (built 2026-09-02/03)

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
