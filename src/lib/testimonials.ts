import { supabase } from './supabase';

export interface Testimonial {
  id: string;
  quote: string;
  author_name: string;
  author_role: string | null;
  practice_name: string | null;
  slots: string[];
}

let cache: Promise<Testimonial[]> | null = null;

// Build-time fetch, once per build. Any failure (table missing, network)
// means "no testimonials," which renders nothing: never a placeholder.
export function getTestimonials(): Promise<Testimonial[]> {
  cache ??= (async () => {
    const { data, error } = await supabase
      .from('testimonials')
      .select('id, quote, author_name, author_role, practice_name, slots')
      .eq('approved', true)
      .order('sort_order');
    if (error) return [];
    return (data ?? []) as Testimonial[];
  })();
  return cache;
}
