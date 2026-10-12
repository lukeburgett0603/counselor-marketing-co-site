// Returns one Caseload Audit by its private token, for /audit?t=<token>.
// The token is the only key: 36 random hex characters, unguessable. Counts
// views of finished audits (first view time + total) so Luke can see
// whether a prospect opened theirs. The internal-only `mapPack` field is
// stripped before anything reaches the browser.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === 'string' ? body.token : '';
  if (!/^[0-9a-f]{36}$/.test(token)) return json({ error: 'Not found' }, 404);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: a } = await db
    .from('audits')
    .select('id, status, data, first_viewed_at, view_count')
    .eq('token', token)
    .maybeSingle();
  if (!a) return json({ error: 'Not found' }, 404);

  if (a.status === 'done' && body.count !== false) {
    await db
      .from('audits')
      .update({ view_count: (a.view_count ?? 0) + 1, first_viewed_at: a.first_viewed_at ?? new Date().toISOString() })
      .eq('id', a.id);
  }
  if (a.status !== 'done') return json({ status: a.status });
  const { mapPack: _internal, ...data } = (a.data ?? {}) as Record<string, unknown>;
  return json({ status: 'done', data });
});
