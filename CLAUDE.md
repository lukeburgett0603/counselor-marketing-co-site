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

## Admin CMS: Edge Functions for anything needing a secret at request time

Being planned/built in phases (business info fields → Edge Function → blog posting →
website content editing → multi-user roles) so client-site admins can eventually
manage content from their own login instead of touching Supabase directly. Full
architecture lives in this project's own memory/CLAUDE.md, not repeated here — this
section is the durable, template-level pattern worth reusing on every future piece.

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
`suggested_value`, `submitted_by`); nobody has a *review* UI yet — that's
explicitly backlogged, Counselor-Marketing-Co-only (see project memory).
The submit-side RLS policy is intentionally simple: any authenticated
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
  window will hit "email rate limit exceeded." Worth flagging to a
  client who plans to invite more than one or two people at once —
  configuring custom SMTP (Resend, Postmark, etc.) in Supabase's Auth
  settings removes this ceiling, but isn't set up by default and wasn't
  part of this phase's scope.
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
  happen to visit Suggestions). Real email/Slack alerts are backlogged
  for when checking in on client sites regularly stops being enough — see
  project memory.
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
