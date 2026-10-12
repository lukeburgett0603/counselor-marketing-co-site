// Returns one Caseload Audit by its private token, for /audit?t=<token>.
// The token is the only key: 36 random hex characters, unguessable. Counts
// views of finished audits (first view time + total) so Luke can see
// whether a prospect opened theirs, and emails Luke the first time they do
// (alertLuke). The internal-only `mapPack` field is
// stripped before anything reaches the browser.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PAGE_URL = Deno.env.get('AUDIT_PAGE_URL') ?? 'https://lukeburgett0603.github.io/counselor-marketing-co-site/audit';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const ADMIN_URL = (Deno.env.get('AUDIT_PAGE_URL') ?? 'https://lukeburgett0603.github.io/counselor-marketing-co-site/audit').replace(/\/audit$/, '/admin');
const esc = (v: string) => v.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// "Just opened their audit": the best-timed follow-up Luke gets. Emailed to
// business.lead_notification_email the first time a prospect opens it.
// Best-effort: a failed alert never affects the prospect's page.
async function alertLuke(db: ReturnType<typeof createClient>, id: string) {
  try {
    const key = Deno.env.get('NURTURE_RESEND_API_KEY');
    const sender = Deno.env.get('NURTURE_SENDER_EMAIL');
    const { data: biz } = await db.from('business').select('lead_notification_email').maybeSingle();
    const to = String(biz?.lead_notification_email ?? '').split(',').map((x) => x.trim()).filter(Boolean);
    if (!key || !sender || !to.length) return;
    const { data: a } = await db
      .from('audits')
      .select('token, name, email, practice_name, practice_input, city, state, created_at, lead_id')
      .eq('id', id)
      .single();
    if (!a) return;
    const practice = a.practice_name ?? a.practice_input;
    const who = a.name ?? a.email;
    const sent = new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' });
    const links = [
      `<a href="${PAGE_URL}?t=${a.token}&preview=1">Open their audit</a> (doesn't count as their view)`,
      a.lead_id ? `<a href="${ADMIN_URL}/crm?lead=${a.lead_id}">Open their inquiry</a>` : '',
    ].filter(Boolean);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Caseload Audit <${sender}>`,
        to,
        reply_to: a.email,
        subject: `${who} just opened their audit (${practice})`,
        html: `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#18181b">
<p><strong>${esc(who)}</strong> just opened the Caseload Audit for <strong>${esc(practice)}</strong>${a.city ? ` in ${esc(a.city)}, ${esc(a.state ?? '')}` : ''}. It was sent ${esc(sent)}.</p>
<p>${links.join('<br>')}</p>
<p style="font-size:12px;color:#71717a">Reply to this email to write to ${esc(who)} directly.</p>
</div>`,
      }),
    });
    if (!res.ok) console.error('get-audit: alert rejected', res.status, (await res.text()).slice(0, 200));
  } catch (err) {
    console.error('get-audit: alert failed', String(err));
  }
}

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
    if (!a.first_viewed_at) {
      // Only the request that actually sets first_viewed_at sends the
      // alert, so two tabs opening at once can't send it twice.
      const { data: first } = await db
        .from('audits')
        .update({ view_count: (a.view_count ?? 0) + 1, first_viewed_at: new Date().toISOString() })
        .eq('id', a.id)
        .is('first_viewed_at', null)
        .select('id');
      if (first?.length) await alertLuke(db, a.id);
    } else {
      await db.from('audits').update({ view_count: (a.view_count ?? 0) + 1 }).eq('id', a.id);
    }
  }
  if (a.status !== 'done') return json({ status: a.status });
  const { mapPack: _internal, ...data } = (a.data ?? {}) as Record<string, unknown>;
  return json({ status: 'done', data });
});
