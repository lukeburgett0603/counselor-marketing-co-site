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
  | 'Counselors Overview';

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
  credentials: string | null;
  author_name: string | null;
  date_published: string | null;
  date_modified: string | null;
  area_served_name: string | null;
  images: Record<string, ImageSlot>;
  cta_heading: string | null;
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
  // by Modalities.astro as its own H2 section below the personal quote.
  // Plain string tags, not linked anywhere (unlike specialties) - purely
  // self-service, see 0029_counselor_card_v2.sql.
  modalities: string[];
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
  design_inspiration_urls: string[];
  brand_assets_status: 'provided' | 'not-provided';
  founding_year: number | null;
  price_range: string | null;
  telephone: string | null;
  email: string | null;
  street_address: string | null;
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
  // A link to the business's EHR client portal (SimplePractice,
  // TherapyNotes, etc.) for existing clients — see 0009_client_portal_url.sql.
  client_portal_url: string | null;
  // Drives which /admin/content fields render as directly editable vs.
  // locked-with-a-suggestion — see 0011_content_permission_and_suggestions.sql
  // and CLAUDE.md's Admin CMS content-permission-tier section.
  content_permission_level: 'restricted' | 'full';
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
