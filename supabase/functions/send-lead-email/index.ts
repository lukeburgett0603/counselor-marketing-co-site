// CMC-ONLY (never synced to the template). CRM phase 1 (2026-11-08):
// Luke writes to a prospect from Inquiries, and the email goes out as a
// branded letter signed by him, logged on the prospect's timeline.
//
// Actions (POST JSON, signed-in active owner/agency only):
//   { action: 'preview', lead_id, subject, body }       -> { html }
//   { action: 'send', lead_id, subject, body, template_id? } -> { ok, message_id }
// `body` is plain text: blank lines split paragraphs, lines starting with
// "- " become a list, and web addresses become links.
//
// Replies: when INBOUND_REPLY_DOMAIN is set (phase 2), reply-to is the
// prospect's private address r-<reply_token>@<domain>, which
// receive-lead-email files on their timeline. Until then it's Luke's own
// inbox (the first business.lead_notification_email).
//
// Sending pauses the automatic audit follow-ups for this prospect and
// moves a Waiting prospect to Contacted.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { renderEmail, escapeHtml } from '../_shared/emailLayout.ts';
import { BRAND, LUKE_SIGNATURE } from '../_shared/brand.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const linkify = (escaped: string) =>
  escaped.replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)]/g, (u) => `<a href="${u}">${u}</a>`);

// Plain text to email HTML. Each block becomes a <p> or a <ul>.
export function textToHtml(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split('\n');
      if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
        const items = lines.map((l) => `<li style="margin:0 0 6px;">${linkify(escapeHtml(l.replace(/^\s*[-•]\s+/, '')))}</li>`).join('');
        return `<ul style="margin:0 0 16px;padding-left:22px;">${items}</ul>`;
      }
      return `<p>${lines.map((l) => linkify(escapeHtml(l))).join('<br>')}</p>`;
    })
    .join('\n');
}

const build = (subject: string, body: string) =>
  renderEmail({
    brand: BRAND,
    preheader: body.replace(/\s+/g, ' ').trim().slice(0, 110),
    bodyHtml: textToHtml(body),
    signature: LUKE_SIGNATURE,
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const auth = req.headers.get('Authorization');
  if (!auth) return json({ error: 'Not signed in' }, 401);
  const url = Deno.env.get('SUPABASE_URL')!;
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const {
    data: { user },
  } = await caller.auth.getUser();
  if (!user) return json({ error: 'Not signed in' }, 401);

  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: me } = await db.from('admin_users').select('role, status').eq('id', user.id).maybeSingle();
  if (!me || !['owner', 'agency'].includes(me.role) || me.status !== 'active') return json({ error: 'Not allowed' }, 403);

  const body = await req.json().catch(() => ({}));
  const action = body.action === 'send' ? 'send' : 'preview';
  const subject = String(body.subject ?? '').trim();
  const text = String(body.body ?? '');
  const leadId = String(body.lead_id ?? '');
  if (!subject || !text.trim()) return json({ error: 'Add a subject and a message.' }, 400);
  if (subject.length > 200 || text.length > 20000) return json({ error: 'That email is too long.' }, 400);

  const { data: lead } = await db
    .from('leads')
    .select('id, name, email, status, reply_token, first_reply_at, followups_paused_at')
    .eq('id', leadId)
    .maybeSingle();
  if (!lead) return json({ error: 'Inquiry not found' }, 404);

  const html = build(subject, text);
  if (action === 'preview') return json({ html });

  if (!lead.email) return json({ error: 'This inquiry has no email address.' }, 400);
  if (/\{\{\s*\w+\s*\}\}|\[[^\]]*\]/.test(subject + text)) {
    return json({ error: 'Fill in the parts in {{ }} or [ ] first.' }, 400);
  }

  const key = Deno.env.get('NURTURE_RESEND_API_KEY');
  const sender = Deno.env.get('NURTURE_SENDER_EMAIL');
  if (!key || !sender) return json({ error: 'Email is not set up.' }, 500);
  const fromEmail = Deno.env.get('LUKE_SENDER_EMAIL') ?? `luke@${sender.split('@')[1]}`;

  const inboundDomain = Deno.env.get('INBOUND_REPLY_DOMAIN');
  let replyTo: string | undefined;
  if (inboundDomain && lead.reply_token) {
    replyTo = `r-${lead.reply_token}@${inboundDomain}`;
  } else {
    const { data: biz } = await db.from('business').select('lead_notification_email').maybeSingle();
    replyTo = String(biz?.lead_notification_email ?? '').split(',').map((s) => s.trim()).filter(Boolean)[0];
  }

  // Thread under their latest reply, when there is one (phase 2).
  const { data: lastIn } = await db
    .from('lead_messages')
    .select('message_id')
    .eq('lead_id', lead.id)
    .eq('direction', 'in')
    .not('message_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const headers = lastIn?.message_id ? { 'In-Reply-To': lastIn.message_id, References: lastIn.message_id } : undefined;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `Luke Burgett <${fromEmail}>`,
      to: [lead.email],
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject,
      html,
      text: `${text.trim()}\n\n${LUKE_SIGNATURE.name}\n${LUKE_SIGNATURE.title}`,
      ...(headers ? { headers } : {}),
    }),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    console.error('send-lead-email: Resend rejected', res.status, detail);
    return json({ error: `The email didn't send (${res.status}). Nothing was logged.` }, 502);
  }
  const sent = await res.json().catch(() => ({}));

  const now = new Date().toISOString();
  const { data: msg } = await db
    .from('lead_messages')
    .insert({
      lead_id: lead.id,
      direction: 'out',
      from_email: fromEmail,
      to_email: lead.email,
      subject,
      body_text: text.trim(),
      body_html: html,
      resend_id: sent.id ?? null,
      in_reply_to: lastIn?.message_id ?? null,
      template_id: typeof body.template_id === 'string' && body.template_id ? body.template_id : null,
      sent_by: user.id,
    })
    .select('id')
    .single();

  const update: Record<string, unknown> = { last_activity_at: now, unread_reply_at: null };
  if (!lead.first_reply_at) update.first_reply_at = now;
  if (!lead.followups_paused_at) update.followups_paused_at = now;
  if ((lead.status ?? 'new') === 'new') update.status = 'contacted';
  await db.from('leads').update(update).eq('id', lead.id);
  if (!lead.followups_paused_at) {
    await db.from('lead_events').insert({ lead_id: lead.id, kind: 'followups_paused', detail: { why: 'email' }, created_by: user.id });
  }

  return json({ ok: true, message_id: msg?.id ?? null });
});
