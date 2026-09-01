import { supabase } from './supabase';

export interface LeadMagnet {
  id: string;
  page_id: string;
  title: string;
  description: string;
  file_url: string;
  file_name: string;
  image_url: string | null;
  image_alt: string | null;
  image_credit_name: string | null;
  image_credit_url: string | null;
}

// Called at build time from LeadMagnet.astro — most pages won't have one,
// so null is the expected common case, not an error.
export async function getLeadMagnetForPage(pageId: string): Promise<LeadMagnet | null> {
  const { data } = await supabase.from('lead_magnets').select('*').eq('page_id', pageId).maybeSingle();
  return data as LeadMagnet | null;
}
