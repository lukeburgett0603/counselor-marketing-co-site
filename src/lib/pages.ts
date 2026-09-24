import { supabase } from './supabase';

export type PageType =
  | 'Homepage'
  | 'About'
  | 'Services Overview'
  | 'Service Page'
  | 'Content Pillar'
  | 'Counselor Profile'
  | 'Service Area'
  | 'Contact'
  | 'Other'
  | 'Blog Post'
  | 'Blog Index'
  | 'Who We Serve'
  | 'Service Areas Overview'
  | 'Service Hub'
  | 'Counselors Overview'
  // Client-repo-only — not part of the shared template (CMC's own
  // pricing page, rendered by templates/Pricing.astro + components/
  // PricingTable.astro). Re-add this after syncing any future template
  // change to pages.ts into this repo. See 0035_pricing_page_type.sql.
  | 'Pricing';

// The 3 page types short/compact enough that the whole page is basically
// one pass through the StoryBrand arc, so they get the 5 storybrand_*
// columns as separate admin fields instead of one flowing `copy` box.
// Content Pillar and Service Hub are deliberately excluded — both are
// long-form, TOC-organized informational content where forcing a rigid
// 5-beat sales narrative risks reading as promotional rather than
// helpful. Shared between the admin UI and any template logic that needs
// to know this list, so it can't drift between the two. See
// 0034_storybrand_sections.sql and CLAUDE.md's "StoryBrand
// section-by-section copy editing" section.
export const STORYBRAND_SPLIT_PAGE_TYPES: PageType[] = ['Homepage', 'Service Page', 'Counselor Profile'];

export interface ImageSlot {
  url: string;
  alt: string;
  // Only set for Unsplash-sourced photos — required for their API's
  // attribution guidelines. Absent for client-supplied photos.
  creditName?: string;
  creditUrl?: string;
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  page_type: PageType;
  purpose: string | null;
  hero_subhead: string | null;
  nav_placement: 'primary' | 'footer' | 'utility' | 'none';
  nav_order: number;
  parent_page_id: string | null;
  internal_links: string[];
  status: 'placeholder' | 'in-progress' | 'content-complete';
  h1: string | null;
  meta_title: string | null;
  meta_description: string | null;
  focus_keyword: string | null;
  copy: string | null;
  // The 5 StoryBrand narrative beats that don't already have their own
  // column (Plan has plan_steps, Guide's Authority has testimonial_quote/
  // concerns, the Direct CTA has cta_heading/cta_button_text) — only
  // meaningful on 'Homepage'/'Service Page'/'Counselor Profile', the 3
  // page types short/compact enough that the whole page is basically one
  // pass through the story arc. Null on every other page type, which
  // keeps rendering `copy` as one flowing field exactly as before — see
  // 0034_storybrand_sections.sql and CLAUDE.md's "StoryBrand
  // section-by-section copy editing" section.
  storybrand_problem: string | null;
  storybrand_guide_empathy: string | null;
  storybrand_pitch: string | null;
  // Admin-editable text for the CollapsibleSection trigger that wraps
  // storybrand_pitch on Homepage/Service Page/Counselor Profile — null
  // falls back to CollapsibleSection.astro's own default ("Learn more
  // about our approach"). See 0035_storybrand_pitch_label.sql.
  storybrand_pitch_label: string | null;
  storybrand_success: string | null;
  storybrand_failure: string | null;
  // Service Area's collapsed comprehensive-depth field (genuinely
  // unique, location-specific content), rendered via CollapsibleSection
  // alongside `copy`'s short visible core positioning. See
  // 0064_service_area_local_detail.sql and page-types.md's word-count
  // split for this page type.
  local_area_detail: string | null;
  credentials: string | null;
  author_name: string | null;
  date_published: string | null;
  date_modified: string | null;
  area_served_name: string | null;
  images: Record<string, ImageSlot>;
  cta_heading: string | null;
  // A short paragraph shown between the CTA heading and button — same
  // ungated category as cta_heading/cta_button_text. See
  // 0053_cta_subheading.sql.
  cta_subheading: string | null;
  cta_button_text: string | null;
  testimonial_quote: string | null;
  testimonial_author: string | null;
  testimonial_role: string | null;
  plan_steps: { title: string; description: string }[];
  faqs: { question: string; answer: string }[];
  // Same shape as plan_steps, deliberately not reused for it — this is a
  // flat, unordered set (e.g. "what this can help with"), rendered by
  // FeatureGrid.astro without PlanSteps.astro's numbered badge, which
  // would misleadingly imply a sequence. See 0027_concerns.sql.
  concerns: { title: string; description: string }[];
  // Client-repo-only — not part of the shared template. Only meaningful
  // on page_type = 'Pricing'. Rendered by PricingTable.astro. Re-add
  // this after syncing any future template change to pages.ts into this
  // repo. See 0035_pricing_page_type.sql.
  pricing_tiers: {
    name: string;
    price: string;
    price_note: string | null;
    best_for: string;
    features: string[];
    cta_text: string;
    highlighted: boolean;
  }[];
  // Free-text taxonomy — a 'Blog Post' row's own topic, or (on a 'Content
  // Pillar' hub row) which category feeds its embedded spoke-post section.
  // Independent of the service list on purpose — see 0007_blog.sql.
  category: string | null;
  // Short summary bullets rendered before a hub page's main content (see
  // KeyTakeaways.astro) — see 0008_key_takeaways.sql.
  key_takeaways: string[];
  // Only meaningful on a 'Service Page' row — which section of the
  // Services Overview grid it belongs to. 'deliverable' = a distinct
  // scope of work (Website Design, SEO, ...); 'segment' = the same
  // underlying services, priced/tailored for a specific practice type
  // (Solo, Group, Psychologist Marketing). null on every other page
  // type. See 0020_service_page_groups.sql — this is what makes the
  // Services Overview grid pull every Service Page automatically
  // instead of relying on a manually-curated list that's easy to forget
  // to update when a new Service Page is added.
  service_group: 'deliverable' | 'segment' | null;
  // Only meaningful on a 'Counselor Profile' page - rendered as clickable
  // pill links by SpecialtyPills.astro. page_slug is null when no real
  // page accurately matches that specialty; the pill renders as plain,
  // non-clickable text rather than forcing an inaccurate link. See
  // 0028_counselor_card.sql - deliberately a structured column, not the
  // old flat "**Specialties:** A, B, C" string in `copy`, since a string
  // can't carry a real link.
  specialties: { label: string; page_slug: string | null }[];
  // Only meaningful on a 'Counselor Profile' page - rendered as a subtle
  // colored pill by StatusPill.astro. Null means no status has been set
  // yet, which renders no pill at all (never invented/guessed - see
  // 0028_counselor_card.sql). Self-service editable by the counselor's
  // own linked 'staff' admin login on admin/counselor-settings.astro.
  availability_status: 'accepting' | 'almost_full' | 'not_accepting' | null;
  // Only meaningful on a 'Counselor Profile' page - a plain boolean pill
  // in the header card. Defaults false (no pill) for the same
  // never-invent/guess reason as availability_status - self-service
  // editable, see 0029_counselor_card_v2.sql.
  telehealth_available: boolean;
  // Only meaningful on a 'Counselor Profile' page - a counselor's own
  // list of clinical training/approaches (e.g. "EMDR", "ACT"), rendered
  // by Modalities.astro inside the header card, in its own labeled
  // section near SpecialtyPills. Plain string tags, not linked anywhere
  // (unlike specialties) - purely self-service, picked from
  // lib/modalities.ts's MODALITY_OPTIONS or typed as a custom "Other"
  // entry on admin/counselor-settings.astro, see 0029_counselor_card_v2.sql
  // and 0036_counselor_license_number.sql.
  modalities: string[];
  // Only meaningful on a 'Counselor Profile' page - a counselor's own
  // professional license number (e.g. "LPCA #12345"), shown next to
  // credentials in the header card and on the Counselors Overview grid.
  // Self-service editable on admin/counselor-settings.astro, same as
  // availability_status/telehealth_available/modalities - never
  // defaulted/guessed. See 0036_counselor_license_number.sql.
  license_number: string | null;
  // Only meaningful on a 'Counselor Profile' page - a counselor's own
  // free-text degree/institution line (e.g. "M.A. Clinical Mental Health
  // Counseling, Colorado Christian University"), shown near credentials
  // when set. Self-service on admin/counselor-settings.astro, same
  // never-defaulted/guessed discipline as license_number. See
  // 0037_counselor_education_and_title.sql.
  education: string | null;
  // Only meaningful on a 'Counselor Profile' page - the spelled-out form
  // of the short `credentials` abbreviation (e.g. "Licensed Professional
  // Counselor Associate" for "LPCA"). Deliberately free text rather than
  // an abbreviation->title lookup table - `credentials` is itself
  // freeform (see Tony Gore's "LCSW, Owner/Director"), so a reliable
  // lookup isn't possible, and a plain field generalizes to any future
  // client's own licensing scheme with no code change. Self-service on
  // admin/counselor-settings.astro. See 0037_counselor_education_and_title.sql.
  professional_title: string | null;
  // Only meaningful on a 'Counselor Profile' page - an optional
  // persuasive tagline rendered as the literal <h1> instead of the
  // counselor's own name (page.title stays visible elsewhere in the
  // header card either way). Null falls back to page.title, so every
  // existing Counselor Profile renders unchanged until a client opts in.
  // Edited on admin/content/page-copy.astro, tier-gated like
  // hero_subhead. See 0038_hero_headline.sql.
  hero_headline: string | null;
  // Which Hero.astro layout this page uses. 'default' (today's
  // side-by-side image/aside) is the default for every page on every
  // client site; 'overlay' is opt-in per page - a full-bleed background
  // image with a color/opacity tint for legibility, never available on
  // 'Counselor Profile' pages (which don't use Hero.astro at all - see
  // CounselorProfile.astro's own header card). See 0030_hero_overlay_style.sql.
  hero_style: 'default' | 'overlay';
  // Only meaningful when hero_style is 'overlay'. Real DB defaults (a
  // sensible dark tint), not left null/unset - this is a technical
  // rendering default, not invented business content, so it's fine for
  // a page to inherit it without an admin having touched it yet.
  hero_overlay_color: string;
  hero_overlay_opacity: number;
  // Biases the hero image's object-fit: cover crop toward the top or
  // bottom of the source photo instead of always centering on the
  // frame - a photo whose actual subject isn't centered in the frame
  // (headroom, rule-of-thirds compositions, etc.) gets clipped across
  // the subject under a plain centered crop otherwise. Applies to
  // whichever Hero layout is active (default or overlay) - it's a
  // property of the image, not the layout. Defaults to 'center', the
  // same crop every existing page already gets. See
  // 0031_hero_image_focal_point.sql.
  hero_image_focal_y: 'top' | 'center' | 'bottom';
  // The icon+label strip directly under the Hero (2-4 items) — only
  // meaningful on 'Homepage'. `icon` is a key into Icon.astro's fixed
  // set, not a free-text/URL value, so the strip stays visually
  // consistent across every client site. See
  // 0048_homepage_value_add_and_authority.sql.
  value_add_items: { icon: string; label: string }[];
  // Short scannable credibility facts in the Guide section (e.g.
  // "Experience" / "15+ years") — only meaningful on 'Homepage'. Same
  // {label, value}[] shape as plan_steps/faqs/concerns's
  // {title, description}[] so the admin UI reuses the same list-editor
  // factory. See 0048_homepage_value_add_and_authority.sql.
  guide_authority_stats: { label: string; value: string }[];
  // Only meaningful on a 'Service Page'/'Service Hub' row — whether
  // this service is one of the (up to 3) cards shown in the Homepage's
  // Featured Services section, and its display order there. The
  // frontend filters/sorts/slices to 3 itself; more than 3 flagged
  // rows is harmless. See 0049_featured_services.sql.
  featured_on_homepage: boolean;
  homepage_feature_order: number | null;
  // The Homepage's "Explanatory Paragraph" section — a genuinely
  // separate, freestanding full BrandScript (not one of the 5
  // storybrand_* beats above, which stay short/scannable). one_liner
  // is the visible H2, teaser is the always-visible short paragraph,
  // full is the long-form text revealed by "Continue reading",
  // video_url is an optional plain video link. All only meaningful on
  // 'Homepage'. See 0050_explanatory_brandscript.sql.
  brandscript_one_liner: string | null;
  brandscript_teaser: string | null;
  brandscript_full: string | null;
  brandscript_video_url: string | null;
  // Which column of the redesigned 3-column footer this page's link
  // renders in — only meaningful when nav_placement = 'footer'. A
  // fixed enum (not free text) so Footer.astro can render a
  // guaranteed, predictable 3-column layout. See
  // 0051_footer_columns_and_cta.sql.
  footer_column: 'explore' | 'company' | 'legal' | null;
}

export interface Business {
  id: string;
  business_subtype: string;
  display_name: string;
  legal_name: string | null;
  logo_url: string | null;
  // Opt-in — render logo_url as a real <img> in Header.astro instead of the
  // CSS-generated text wordmark. See 0026_logo_in_header.sql.
  logo_in_header: boolean;
  brand_colors: string[];
  brand_fonts: string[];
  // The exact Google Fonts CSS2 URL for this client's real brand font(s)
  // (weights/optical sizes included) — BaseLayout.astro loads it via
  // <link rel="stylesheet"> when set, null falls back to the OS system
  // font. See 0033_google_fonts_url.sql.
  google_fonts_url: string | null;
  // Cloudflare Web Analytics beacon token — public/client-side, not a
  // secret. BaseLayout.astro renders the beacon script when set, renders
  // nothing when null. See 0043_cloudflare_analytics_token.sql.
  cloudflare_beacon_token: string | null;
  design_inspiration_urls: string[];
  brand_assets_status: 'provided' | 'not-provided';
  founding_year: number | null;
  price_range: string | null;
  telephone: string | null;
  email: string | null;
  street_address: string | null;
  // Suite/unit, kept separate from street_address for clean data entry
  // — see 0047_street_address_2.sql. Every renderer that displays or
  // schemas the address joins the two back together.
  street_address_2: string | null;
  address_locality: string | null;
  address_region: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  opening_hours: unknown;
  same_as: string[];
  photos: string[];
  google_maps_url: string | null;
  collect_website_in_leads: boolean;
  lead_response_time_note: string | null;
  // Shows the "Select a Counselor" / "Help me choose" dropdown on every
  // LeadGenerator — opt-in since a solo-practice or non-counseling client
  // has no one to select. See 0023_counselor_preference.sql and
  // getCounselorOptions() below.
  collect_counselor_preference: boolean;
  // Shows a "Preferred Session Format" (In-Person / Telehealth) radio
  // group on every LeadGenerator — same opt-in pattern as
  // collect_counselor_preference, since a fully-telehealth or
  // fully-in-person client has nothing to ask. See
  // 0039_session_format_preference.sql.
  collect_session_format_preference: boolean;
  // Where the submit-lead Edge Function sends a real-time "someone just
  // submitted the contact form" notification — null means no
  // notification is sent. See 0041_lead_notification_email.sql.
  lead_notification_email: string | null;
  // Cloudflare Turnstile site key (public) — renders the anti-spam widget
  // on LeadGenerator when set; null means Turnstile is off. See
  // 0042_turnstile_site_key.sql.
  cloudflare_turnstile_site_key: string | null;
  // A link to the business's EHR client portal (SimplePractice,
  // TherapyNotes, etc.) for existing clients — see 0009_client_portal_url.sql.
  client_portal_url: string | null;
  // Drives which /admin/content/page-copy fields render as directly editable vs.
  // locked-with-a-suggestion — see 0011_content_permission_and_suggestions.sql
  // and CLAUDE.md's Admin CMS content-permission-tier section.
  content_permission_level: 'restricted' | 'full';
  // Gates the 988 Suicide & Crisis Lifeline line in the nurture-email
  // footer (send-nurture-emails) and, site-wide, in Footer.astro. Defaults
  // true — see 0032_crisis_resource_line.sql and CLAUDE.md's "Nurture
  // email crisis-resource line" section for why a non-counseling client
  // like Counselor Marketing Co. must override this to false explicitly.
  show_crisis_resources: boolean;
  // Heading for the CTA band shown directly above the footer on every
  // page — null falls back to a display_name-based default, same
  // pattern as CTA.astro's own existing heading fallback. See
  // 0051_footer_columns_and_cta.sql.
  footer_cta_heading: string | null;
}

// Only content-complete pages are ever rendered — a page left at
// `placeholder` or `in-progress` means webpage-copywriter hasn't finished it
// yet, and frontend-site-builder-supabase should never invent copy to fill
// the gap (same rule as the original Wix skill).
export async function getPublishedPages(): Promise<Page[]> {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('status', 'content-complete');
  if (error) throw error;
  return data as Page[];
}

export async function getPageBySlug(slug: string): Promise<Page | null> {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'content-complete')
    .maybeSingle();
  if (error) throw error;
  return data as Page | null;
}

export async function getHomepage(): Promise<Page | null> {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('page_type', 'Homepage')
    .eq('status', 'content-complete')
    .maybeSingle();
  if (error) throw error;
  return data as Page | null;
}

export async function getBusiness(): Promise<Business> {
  const { data, error } = await supabase.from('business').select('*').single();
  if (error) throw error;
  return data as Business;
}

// The "Select a Counselor" dropdown's option list — derived live from
// whichever pages currently have page_type 'Counselor Profile', never a
// hand-curated list (same discipline as the service_group-driven grids).
// Shared by every template that renders LeadGenerator with
// collectCounselorPreference, instead of repeating this filter/sort in each.
export function getCounselorOptions(allPages: Page[]): { id: string; title: string }[] {
  return allPages
    .filter((p) => p.page_type === 'Counselor Profile')
    .sort((a, b) => a.nav_order - b.nav_order)
    .map((p) => ({ id: p.id, title: p.title }));
}

// Best-effort avatar lookup for a Blog Post card's byline — matches
// `author_name` against a live Counselor Profile page's title (case/
// whitespace-insensitive), same "derive, don't invent" discipline as
// getCounselorOptions above. Returns null (renders no avatar, never a
// broken image) for any author with no matching Counselor Profile page —
// the normal case for a client with no Counselor Profile page type at
// all (e.g. Counselor Marketing Co.'s own site).
export function getAuthorHeadshot(authorName: string | null, allPages: Page[]): ImageSlot | null {
  if (!authorName) return null;
  const normalized = authorName.trim().toLowerCase();
  const match = allPages.find(
    (p) => p.page_type === 'Counselor Profile' && p.title.trim().toLowerCase() === normalized
  );
  return match?.images.headshot ?? null;
}

// Breadcrumb chain from a page up through its parent_page_id ancestors,
// root first — used for BreadcrumbList schema (never hand-written).
export function buildBreadcrumbChain(page: Page, allPages: Page[]): Page[] {
  const bySlugId = new Map(allPages.map((p) => [p.id, p]));
  const chain: Page[] = [page];
  let current = page;
  while (current.parent_page_id) {
    const parent = bySlugId.get(current.parent_page_id);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}
