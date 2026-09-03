# Counselor Marketing Co. — Client Notes

This file is **this repo only** — it holds decisions, findings, and facts
that are true of Counselor Marketing Co. specifically and would be noise
(or actively wrong) in any other client's repo. It is never synced in
either direction: the template repo doesn't have a `NOTES.md`, and this
file never gets copied back there. Generic, reusable patterns and bugs
live in `CLAUDE.md` instead (synced from the template) — see its "Where
client-specific decisions get written down" note.

## Open action items

- **No custom domain yet.** The site is live on the raw
  `lukeburgett0603.github.io/counselor-marketing-co-site` GitHub Pages
  subdomain. Confirmed via Mangools SiteProfiler: Domain Authority 1 —
  a real structural ceiling on all the SEO/content work, independent of
  content quality. Higher priority than further keyword/content work at
  this point. (See `CLAUDE.md`'s "Domain" standard — this finding is what
  that generic rule was written from.)
- **`business.street_address` and related address fields are still
  null.** This is a real CAN-SPAM gap: every nurture email footer needs a
  mailing address (see `CLAUDE.md`'s Lead magnet nurture sequences
  section), and it's currently rendering with none. Fill in via Website
  content → Business info before any nurture sequence goes live for real
  leads.

## SEO / keyword research (2026-09-02, via Mangools MCP)

**Competitor audit — marketingfortherapists.org**: Domain Authority 20,
Page Authority 35, 689 backlinks/193 referring domains, but Citation Flow
36 vs. Trust Flow only 5 — a strong signal the link profile is
low-quality/spammy (one backlink's actual anchor text was a PBN-spam
promotional string). Ranks #2 only for their own brand-matched phrase
("marketing for therapists"); invisible (position 45+) for all 96 other
tracked keywords, including every one of CMC's actual target terms. Their
apparent authority is thinner than it looks on the surface.

**"digital marketing for counselors" (CMC's primary keyword) is genuinely
winnable** — current SERP #1 has Domain Authority only 9.

**Validated content targets** (real commercial or informational intent,
real audience, real volume):
- `private practice marketing` (170/mo, KD19, commercial) — Solo Practice
  Marketing's focus keyword.
- `therapist marketing` (500/mo, KD18) — SEO & Marketing pillar
  (`therapist-marketing`)'s keyword.
- `website design for therapists` / `web design for therapists` (550/mo
  each) — Website Design's keyword.
- `SEO for therapists` / `therapist seo` (620/mo, KD19) — SEO's keyword.
- `therapist branding` (580–600/mo, KD only 7) — best volume-to-difficulty
  ratio found; was completely untapped before this pass. Built as its own
  Content Pillar, `therapist-branding`.
- `google ads for therapists` (210/mo, KD10) — untapped before this pass;
  built as a new Service Page, `google-ads-for-therapists`.

**Real but too small for a dedicated page**: `therapist marketing agency`
/ `therapy marketing agency` (40/mo each, KD17, nearly identical
audience) — folded in as supporting keywords on an existing page rather
than a standalone target. (Adjacent "physical therapy marketing agency" /
"physiotherapy marketing agency" terms are a *different*, irrelevant
audience — noise to filter, not a related opportunity.)

**No measurable volume, and that's fine for what these pages are**:
`group practice marketing`, `digital marketing services for psychologists`
(only 10/mo — broader "digital marketing for therapists" performs much
better at 90/mo, but the narrower phrase was kept for accuracy), `christian
counseling marketing` / `faith based counseling marketing`. These are all
"Who We Serve" segment pages — conversion/positioning pages for someone
already on the site, not organic-traffic plays. See `CLAUDE.md`'s Services
Overview & Who We Serve section for why that's the right call, not a
compromise.

**Real intent mismatches found and corrected** — a high volume number that
turned out to be the wrong audience entirely:
- `therapist website` (2,000/mo) — navigational, SERP dominated by
  Psychology Today / GoodTherapy / BetterHelp / Talkspace (patient-facing
  directories). `therapist-websites` was retargeted to `best website
  builder for therapists` instead.
- `private practice therapist` (1,800/mo) — career-research content
  (Reddit "is private practice worth it," Indeed listings, APA career
  guidance) — clinicians researching a career move, not marketing buyers.
  `private-practice-growth` was retargeted to `how to market your private
  practice` instead.
- `faith based counseling` (1,700/mo) and its whole related cluster
  ("christian counselors near me" 18,600/mo, "christian marriage
  counselor" 9,800/mo, etc.) — entirely *client*-side search intent
  (someone looking for a Christian counselor), not counselor-side. This is
  why Christian Counseling Marketing's focus keyword stayed
  `christian counseling marketing` (zero measured volume) rather than
  chasing this cluster's real volume — that volume belongs to the wrong
  audience.

## Site architecture as of 2026-09-03

- **Deliverables** (`service_group: 'deliverable'`, on Services Overview):
  Website Design, SEO, Full-Service Marketing, Google Ads for Therapists.
- **Audience segments** (`service_group: 'segment'`, on Who We Serve):
  Solo Practice Marketing, Group Practice Marketing, Psychologist
  Marketing, Christian Counseling Marketing (renamed and rewritten from
  "Faith-Based Counseling" 2026-09-03 — slug is still
  `faith-based-counseling-marketing`, deliberately not changed, to avoid
  breaking the URL for no real SEO gain given the page's own low search
  volume either way).
- **Content Pillars** (hub-and-spoke, accumulate ongoing blog posts):
  Website Design pillar (`therapist-websites`), SEO & Marketing
  (`therapist-marketing`), Practice Growth (`private-practice-growth`),
  Therapist Branding (`therapist-branding`). `faith-based-counseling-
  marketing` used to be a Content Pillar too (`category` field pointed at
  a "Faith-Based Counseling" blog category) — that was already an
  inconsistency by the time this session found it (the category had been
  nulled out earlier, demoting it from an active hub, but its page_type
  hadn't been updated to match) and was fully resolved by the Christian
  Counseling Marketing rewrite: it's a Service Page now, not a pillar.
- **Case study** (`case-study-freedom-counseling`) is its own top-level
  nav item, not folded into any of the above — the site's one client
  case study, used as the recurring "real proof" anchor across other
  pages' copy.

## Christian Counseling Marketing — positioning, for future content

The differentiator isn't "faith-based branding" as a label — it's
credible, specific communication of *how* real clinical training and
genuine theological grounding integrate, for practices that actually do
that work. Key points to carry into any future copy on this topic (from
the founder's own account, 2026-09-03):

- Clients seeking a Christian counselor are usually choosing *both* real
  clinical competence *and* a shared worldview — not trading one for the
  other. Many have had a bad experience with a counselor who dismissed or
  minimized their faith; the messaging needs to address that directly.
- True integration means evidence-based treatment consistent with sound
  theology — not "clinical therapy plus a well-placed Bible verse."
- A practice that also serves non-Christian clients isn't a contradiction:
  integration can be entirely *implicit* (unconditional positive regard,
  bracketing the counselor's own beliefs, seeing the presenting problem
  through the client's own thought patterns and beliefs) rather than
  explicit — never imposing a worldview on someone who doesn't share it.
- Visibility matters beyond general SEO too — Christian counselor
  directories, church referral networks, faith-community word-of-mouth are
  real, distinct channels worth naming.
- Freedom Counseling Services (Louisville, KY) is the only real proof
  point for this positioning right now; expect a second once another
  Christian-counselor client is onboarded (founder's early client base is
  expected to skew toward Christian counselors).
