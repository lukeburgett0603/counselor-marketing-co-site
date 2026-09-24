// Public contact-form submission endpoint — replaces LeadGenerator.astro's
// old direct `POST /rest/v1/leads` REST call so a server-side step can run
// on every real submission: inserting the lead is still the critical path
// (never blocked or failed by anything below), but this also sends a
// real-time "someone just submitted the form" notification email to
// whichever team member(s) business.lead_notification_email names (one
// text field, comma-separated for more than one address — set via the
// admin's Business info screen), with Reply-To set to the lead's own
// submitted email — replying in their normal email client (Outlook,
// Gmail, whatever) goes straight to the lead, no CRM/Resend involvement
// in that reply at all.
//
// Auth: deliberately NOT the "verify_jwt isn't enough, check getUser()"
// pattern every ADMIN-gated function in this project uses (publish-site,
// get-traffic-stats, etc.) — the opposite is true here: this endpoint is
// SUPPOSED to be callable by an anonymous site visitor. The default
// verify_jwt=true is satisfied by the anon key the public site already
// ships (same as every other anon-key REST call this app makes), and
// that's sufficient.
//
// Also the enforcement point for both of this form's spam defenses — the
// client-side honeypot field and Turnstile widget (LeadGenerator.astro)
// are only the UX half; a bot calling this function directly (bypassing
// the form's JS entirely, the way any curl-based test of this function
// already does) would sail through a client-only check. See the two
// checks right after body validation below.
//
// Config (`supabase secrets set ... --project-ref <ref>`):
//   NURTURE_RESEND_API_KEY          - reused from the nurture-sequence
//                                     feature (send-nurture-emails)
//                                     rather than provisioning a second
//                                     Resend key — same verified sending
//                                     domain works fine for a
//                                     transactional notification like
//                                     this one.
//   NURTURE_SENDER_EMAIL            - same reuse.
//   CLOUDFLARE_TURNSTILE_SECRET_KEY - optional; only set for a client who
//                                     has business.cloudflare_turnstile_site_key
//                                     configured (see 0042_turnstile_site_key.sql).
//                                     Unset means this function skips
//                                     Turnstile verification entirely —
//                                     same graceful-degrade pattern as
//                                     every other optional integration in
//                                     this app.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const SESSION_FORMAT_LABELS: Record<string, string> = {
  in_person: 'In-Person',
  telehealth: 'Telehealth',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!name || !email) {
    return jsonResponse({ error: 'Name and email are required' }, 400);
  }

  // Honeypot: a real visitor never sees or fills this field (see
  // LeadGenerator.astro's markup comment), so any non-empty value here is
  // an unsophisticated bot that fills in every input it finds. Reported
  // back as a normal success — never tipping the bot off that it was
  // caught — but the lead is never actually inserted.
  const honeypotValue = typeof body.hp_website === 'string' ? body.hp_website.trim() : '';
  if (honeypotValue) {
    return jsonResponse({ ok: true });
  }

  // Turnstile: only enforced when this project has a secret key configured
  // (i.e. the client opted in via Cloudflare's dashboard). Unlike the
  // honeypot, a failure here is reported as a real error — a legitimate
  // visitor who hit a network/JS hiccup benefits from knowing to retry,
  // and a targeted bot presenting a bad/missing token isn't the kind of
  // unsophisticated automation the honeypot's "don't tip it off" reasoning
  // is aimed at.
  const turnstileSecretKey = Deno.env.get('CLOUDFLARE_TURNSTILE_SECRET_KEY');
  if (turnstileSecretKey) {
    const turnstileToken = typeof body.turnstile_token === 'string' ? body.turnstile_token : '';
    if (!turnstileToken) {
      return jsonResponse({ error: 'Spam verification failed — please try again.' }, 400);
    }
    const remoteIp = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: turnstileSecretKey,
        response: turnstileToken,
        ...(remoteIp ? { remoteip: remoteIp } : {}),
      }),
    });
    const verifyResult = await verifyResponse.json().catch(() => ({ success: false }));
    if (!verifyResult.success) {
      return jsonResponse({ error: 'Spam verification failed — please try again.' }, 400);
    }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Insert is the one part of this function that must succeed for the
  // response to report success — capturing the lead is the whole point,
  // and nothing below (the notification email) is allowed to jeopardize
  // that, matching this project's standing "never let a secondary effect
  // block the primary write" discipline (see triggerRebuild() failures
  // elsewhere in this app degrading to a warning, never a rollback).
  const insertPayload: Record<string, unknown> = {
    name,
    email,
    phone: typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : null,
    message: typeof body.message === 'string' && body.message.trim() ? body.message.trim() : null,
    source_page: typeof body.source_page === 'string' ? body.source_page : null,
  };
  if ('existing_website_url' in body) {
    insertPayload.existing_website_url =
      typeof body.existing_website_url === 'string' && body.existing_website_url.trim()
        ? body.existing_website_url.trim()
        : null;
  }
  if ('preferred_counselor_page_id' in body) {
    insertPayload.preferred_counselor_page_id = body.preferred_counselor_page_id || null;
  }
  if ('preferred_session_format' in body) {
    insertPayload.preferred_session_format = body.preferred_session_format || null;
  }
  // A guide-download submission (LeadMagnet.astro) — a distinct, lower-
  // intent signal from a real appointment request, see CLAUDE.md's
  // "Contacts vs. leads" section. Only present when this call came from
  // that form, never from LeadGenerator.astro's contact form.
  if ('lead_magnet_id' in body) {
    insertPayload.lead_magnet_id = body.lead_magnet_id || null;
  }

  const { data: lead, error: insertError } = await supabase
    .from('leads')
    .insert(insertPayload)
    .select('id')
    .single();

  if (insertError) {
    return jsonResponse({ error: 'Could not save lead: ' + insertError.message }, 500);
  }

  // Everything from here down is best-effort. A failure here still
  // returns { ok: true } to the visitor — the lead is already safely in
  // the database and visible in the admin dashboard either way. Also
  // skipped entirely for a guide download — the notification email
  // below is written as "New appointment request from X" and would be
  // actively misleading for a lower-intent lead-magnet signal instead.
  try {
    if (insertPayload.lead_magnet_id) {
      return jsonResponse({ ok: true, id: lead.id });
    }
    const resendApiKey = Deno.env.get('NURTURE_RESEND_API_KEY');
    const senderEmail = Deno.env.get('NURTURE_SENDER_EMAIL');

    const { data: business } = await supabase
      .from('business')
      .select('display_name, lead_notification_email')
      .maybeSingle();

    // business.lead_notification_email is a single text field that can hold
    // more than one address, comma-separated (set via the admin's Business
    // info screen) — split it into the array Resend's `to` field expects.
    const notificationRecipients = (business?.lead_notification_email ?? '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);

    if (resendApiKey && senderEmail && notificationRecipients.length > 0) {
      let counselorName: string | null = null;
      if (insertPayload.preferred_counselor_page_id) {
        const { data: counselorPage } = await supabase
          .from('pages')
          .select('title')
          .eq('id', insertPayload.preferred_counselor_page_id)
          .maybeSingle();
        counselorName = counselorPage?.title ?? null;
      }

      const rows: [string, string | null][] = [
        ['Name', name],
        ['Email', email],
        ['Phone', insertPayload.phone as string | null],
        [
          'Preferred counselor',
          counselorName,
        ],
        [
          'Preferred session format',
          insertPayload.preferred_session_format
            ? (SESSION_FORMAT_LABELS[insertPayload.preferred_session_format as string] ??
              (insertPayload.preferred_session_format as string))
            : null,
        ],
        ['Current website', insertPayload.existing_website_url as string | null],
        ['From page', (insertPayload.source_page as string | null) ?? '(homepage)'],
      ];
      const rowsHtml = rows
        .filter(([, value]) => value)
        .map(([label, value]) => `<p style="margin:0 0 8px;"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value!)}</p>`)
        .join('\n');
      const messageHtml = insertPayload.message
        ? `<p style="margin:16px 0 4px;"><strong>Message:</strong></p><p style="margin:0;white-space:pre-wrap;">${escapeHtml(insertPayload.message as string)}</p>`
        : '';

      const fromHeader = business.display_name ? `${business.display_name} <${senderEmail}>` : senderEmail;

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromHeader,
          to: notificationRecipients,
          reply_to: email,
          subject: `New appointment request from ${name}`,
          html: `${rowsHtml}\n${messageHtml}\n<hr style="border:none;border-top:1px solid #ddd;margin:20px 0;">\n<p style="font-size:12px;color:#888;">Reply directly to this email to respond to ${escapeHtml(name)}.</p>`,
        }),
      });
      // fetch() only rejects on a network-level failure — a non-2xx from
      // Resend (bad key, unverified sender domain, etc.) resolves normally
      // and was previously never inspected at all, so a rejected send was
      // indistinguishable from a real one: the lead still saved, the
      // visitor still saw success, and nothing anywhere recorded that the
      // notification silently never went out. Logging (not throwing) keeps
      // this non-blocking while making a real failure visible in the
      // function's logs instead of invisible.
      if (!resendResponse.ok) {
        console.error('submit-lead: Resend rejected the notification email', {
          status: resendResponse.status,
          body: await resendResponse.text(),
        });
      }
    }
  } catch (err) {
    // Swallow — notification email is a nice-to-have, never surfaced to
    // the visitor and never allowed to make a captured lead look failed.
    // Still logged, for the same reason as the non-2xx case above.
    console.error('submit-lead: notification email threw', err);
  }

  return jsonResponse({ ok: true, id: lead.id });
});
