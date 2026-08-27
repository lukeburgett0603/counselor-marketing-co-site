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
  | 'Other';

export interface ImageSlot {
  url: string;
  alt: string;
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
}

export interface Business {
  id: string;
  business_subtype: string;
  display_name: string;
  legal_name: string | null;
  logo_url: string | null;
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
