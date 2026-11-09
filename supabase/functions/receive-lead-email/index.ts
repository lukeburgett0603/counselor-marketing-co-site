// CMC-ONLY (never synced to the template). CRM phase 2 (2026-11-09):
// prospects' replies land on their Inquiries timeline.
//
// Resend receives mail for INBOUND_REPLY_DOMAIN (MX record) and POSTs an
// `email.received` webhook here. The webhook carries only metadata, so we
// verify its signature (Svix scheme, RESEND_WEBHOOK_SECRET), fetch the
// email itself (RESEND_RECEIVING_API_KEY, a full-access key), match the
// r-<reply_token> address to an inquiry, keep the new text above the
// quoted reply, save it, and email Luke a "replied" notice with the text.
//
// Never drops mail: an address we can't match, or a message from an
// unknown sender, is still forwarded to Luke. Always answers 200 once the
// signature checks out, so Resend doesn't retry a message we've handled.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { renderEmail, escapeHtml } from '../_shared/emailLayout.ts';
import { BRAND } from '../_shared/brand.ts';
import { lukeInbox, REPLY_PREFIX } from '../_shared/replyAddress.ts';

const ADMIN_URL = `${BRAND.siteUrl}admin`;
const ok = (body: Record<string, unknown> = {}) => new Response(JSON.stringify({ ok: true, ...body }), { headers: { 'Content-Type': 'application/json' } });

// --- Svix signature check (what Resend's SDK does) -------------------------
async function verify(req: Request, raw: string): Promise<boolean> {
  const secret = Deno.env.get('RESEND_WEBHOOK_SECRET');
  const id = req.headers.get('svix-id');
  const ts = req.headers.get('svix-timestamp');
  const sigs = req.headers.get('svix-signature');
  if (!secret || !id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false; // replay window
  const keyBytes = Uint8Array.from(atob(secret.replace(/^whsec_/, '')), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${raw}`));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return sigs.split(' ').some((s) => {
    const [, v] = s.split(',');
    if (!v || v.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < v.length; i++) diff |= v.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  });
}

// --- the new part of a reply ------------------------------------------------
function htmlToText(html: string): string {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h\d)>/gi, '\n')
    .replace(/<div[^>]*class="[^"]*(gmail_quote|gmail_attr)[\s\S]*$/i, '') // Gmail's quoted part
    .replace(/<blockquote[\s\S]*$/i, '') // Apple Mail and others quote in a blockquote
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function newPart(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const cut = lines.findIndex(
    (l, i) =>
      /^On .{6,}(wrote|écrit):?\s*$/i.test(l.trim()) ||
      (/^On .{6,}/i.test(l.trim()) && /wrote:?\s*$/i.test(`${l} ${lines[i + 1] ?? ''}`.trim())) ||
      /^-{2,}\s*Original Message\s*-{2,}/i.test(l.trim()) ||
      /^_{5,}$/.test(l.trim()) ||
      (/^From:\s/i.test(l.trim()) && /^(Sent|Date|To):\s/i.test((lines[i + 1] ?? '').trim())) ||
      /^>/.test(l.trim()),
  );
  const kept = (cut === -1 ? lines : lines.slice(0, cut)).join('\n').trim();
  return kept || text.trim();
}

const addr = (s: string) => (s.match(/<([^>]+)>/)?.[1] ?? s).trim().toLowerCase();

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const raw = await req.text();
  if (!(await verify(req, raw))) return new Response('Invalid signature', { status: 401 });

  let event: { type?: string; data?: Record<string, unknown> } = {};
  try {
    event = JSON.parse(raw);
  } catch {
    return ok({ skipped: 'bad json' });
  }
  if (event.type !== 'email.received') return ok({ skipped: event.type });
  const emailId = String(event.data?.email_id ?? '');
  if (!emailId) return ok({ skipped: 'no email id' });

  const readKey = Deno.env.get('RESEND_RECEIVING_API_KEY');
  const sendKey = Deno.env.get('NURTURE_RESEND_API_KEY');
  const sender = Deno.env.get('NURTURE_SENDER_EMAIL');
  const domain = (Deno.env.get('INBOUND_REPLY_DOMAIN') ?? sender?.split('@')[1] ?? '').toLowerCase();
  if (!readKey) {
    console.error('receive-lead-email: RESEND_RECEIVING_API_KEY not set');
    return new Response('Not configured', { status: 500 }); // let Resend retry once it is
  }

  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, { headers: { Authorization: `Bearer ${readKey}` } });
  if (!res.ok) {
    console.error('receive-lead-email: fetch failed', res.status, (await res.text()).slice(0, 200));
    return new Response('Fetch failed', { status: 502 }); // Resend retries
  }
  const mail = await res.json();
  const from = String(mail.from ?? '');
  const fromAddr = addr(from);
  const subject = String(mail.subject ?? '(no subject)');
  const fullText = String(mail.text ?? '') || htmlToText(String(mail.html ?? ''));
  const text = newPart(fullText);

  // Our own outgoing mail bouncing back into the inbox would loop.
  if (domain && fromAddr.endsWith(`@${domain}`)) return ok({ skipped: 'from our own domain' });

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Match r-<token>@domain among every recipient.
  const recipients = [...(mail.to ?? []), ...(mail.cc ?? []), ...(mail.received_for ?? [])].map((x: string) => addr(String(x)));
  const token = recipients
    .map((r) => r.match(new RegExp(`^${REPLY_PREFIX}([0-9a-f]{16,64})@`))?.[1])
    .find(Boolean);
  let lead: { id: string; name: string | null; email: string | null } | null = null;
  if (token) {
    const { data } = await db.from('leads').select('id, name, email').eq('reply_token', token).maybeSingle();
    lead = data;
  }

  const now = new Date().toISOString();
  if (lead) {
    // Gmail and friends dedupe on Message-ID; so do we, in case of a retry.
    const msgId = mail.message_id ? String(mail.message_id) : null;
    if (msgId) {
      const { data: seen } = await db.from('lead_messages').select('id').eq('lead_id', lead.id).eq('message_id', msgId).limit(1);
      if (seen?.length) return ok({ skipped: 'duplicate' });
    }
    await db.from('lead_messages').insert({
      lead_id: lead.id,
      direction: 'in',
      from_email: fromAddr,
      to_email: recipients[0] ?? null,
      subject,
      body_text: text,
      body_html: mail.html ? String(mail.html) : null,
      resend_id: emailId,
      message_id: msgId,
      in_reply_to: mail.headers?.['in-reply-to'] ? String(mail.headers['in-reply-to']) : null,
    });
    await db.from('leads').update({ unread_reply_at: now, last_activity_at: now }).eq('id', lead.id);
  }

  // Tell Luke, with the message itself, so he never has to open the admin to read it.
  const luke = await lukeInbox(db);
  if (sendKey && sender && luke) {
    const who = lead?.name?.trim() || from || 'Someone';
    const otherSender = lead?.email && fromAddr !== lead.email.toLowerCase();
    const attachments = Array.isArray(mail.attachments) ? mail.attachments.length : 0;
    const html = renderEmail({
      brand: BRAND,
      label: lead ? 'Reply' : 'Unmatched reply',
      preheader: text.replace(/\s+/g, ' ').slice(0, 110),
      paragraphs: [
        lead
          ? `<strong>${escapeHtml(who)}</strong> replied${otherSender ? ` from ${escapeHtml(fromAddr)}` : ''}. It's on their timeline.`
          : `This reply came in at ${escapeHtml(recipients[0] ?? 'the reply address')} and doesn't match an inquiry, so it isn't on any timeline. Here it is so nothing is missed.`,
      ],
      facts: [
        ['From', from],
        ['Subject', subject],
        ['Message', text],
        ['Attachments', attachments ? `${attachments} (open it in Resend to download)` : null],
      ],
      button: lead ? { text: 'Reply in Inquiries', url: `${ADMIN_URL}/crm/?lead=${lead.id}` } : undefined,
      after: [
        `<span style="font-size:14px;color:#52525b;">Replying to this email writes to ${escapeHtml(fromAddr)} directly, but it won't be on the timeline. Reply from Inquiries to keep the whole conversation in one place.</span>`,
      ],
    });
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Inquiries <${sender}>`,
        to: [luke],
        reply_to: fromAddr,
        subject: lead ? `${who} replied: ${subject}` : `Unmatched reply: ${subject}`,
        html,
      }),
    });
    if (!r.ok) console.error('receive-lead-email: notice rejected', r.status, (await r.text()).slice(0, 200));
  }
  return ok({ matched: !!lead });
});
