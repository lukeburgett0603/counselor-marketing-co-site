import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY. Set them in .env for local dev, ' +
      'or as GitHub Actions repo secrets for the build/deploy workflow.'
  );
}

// Same client is safe to reuse at build time (fetching pages/business) and
// client-side (the lead form insert) — it only ever holds the anon key,
// which relies on the RLS policies in supabase/migrations/0001_init.sql.
export const supabase = createClient(url, anonKey);
