// Sends the next due step of a lead's lead-magnet nurture sequence (Day
// 0 / 3 / 7 / 14 after they downloaded a guide — src/lib/nurtureSequence.ts
// on the site side documents the schedule this duplicates and must stay
// in sync with). Triggered on a daily schedule via Supabase's Cron
// (Dashboard → Integrations → Cron — a per-client, one-time manual setup
// step, same reason SMTP itself is manual: project-specific values that
// don't belong hardcoded into a portable migration).
//
// Auth: there's no browser session here — the caller is the cron job
// itself, not a logged-in admin — so this can't use the usual
// "supabase.auth.getUser()" pattern every other function in this project
// relies on. Deliberately NOT compared against SUPABASE_SERVICE_ROLE_KEY
// either — Supabase now has both a legacy JWT-format service_role key and
// a newer sb_secret_-format one, and which one actually gets injected
// into an Edge Function's own environment as SUPABASE_SERVICE_ROLE_KEY
// turned out not to match the key used when calling this function from
// the outside (found by testing this exact call, not by reading docs) —
// so instead this checks a dedicated secret this function owns, which
// sidesteps that ambiguity entirely and is better-scoped besides: whoever
// sets up the Cron job never needs to handle the actual service_role key,
// just this narrower, function-specific one.
//
// Config (`supabase secrets set ... --project-ref <ref>`):
//   NURTURE_CRON_SECRET     - any random value (e.g. `openssl rand -hex 32`).
//                             Configure the Supabase Cron job (Dashboard →
//                             Integrations → Cron) to send this same
//                             value as its Authorization: Bearer header.
//   NURTURE_RESEND_API_KEY - a Resend API key, domain-restricted to
//                            whichever subdomain is verified for nurture
//                            email. Recommended: a SEPARATE subdomain
//                            from the one used for Supabase Auth's own
//                            SMTP (e.g. updates.yourdomain.com vs.
//                            communications.yourdomain.com) — marketing
//                            email naturally draws more unsubscribes/spam
//                            complaints than transactional auth email, so
//                            isolating them protects the domain admin
//                            logins depend on.
//   NURTURE_SENDER_EMAIL   - e.g. "hello@updates.yourdomain.com" — must
//                            live on that same verified subdomain.
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically
// into every Edge Function's environment.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Index i (0-based) is step_order i+1's day offset from the lead's
// created_at. Keep in sync with src/lib/nurtureSequence.ts.
const SEQUENCE_SCHEDULE_DAYS = [0, 3, 7, 14];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

// Nurture email bodies are short — a paragraph or two of admin-authored
// markdown — so this only handles paragraphs/line breaks rather than
// pulling a full markdown parser into the function bundle for content
// this simple. (Unlike the site's own renderCopy(), which handles the
// full range of page copy.)
function renderEmailBody(markdown: string): string {
  return markdown
    .split(/\n\s*\n/)
    .map((para) => `<p>${para.trim().replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

// The lead's own `name` field is whatever they typed into the lead-magnet
// form (see LeadMagnet.astro) — a full name in the common case, but never
// validated to be one, so this takes just the first whitespace-separated
// token rather than assuming a "first last" shape. Falls back to "there"
// (matching a normal "Hi there," greeting) when name is missing/blank,
// since a step's subject/body can legitimately reference {{first_name}}
// and every lead row that reaches this function already required a name
// on submission — this fallback is a belt-and-suspenders case, not the
// expected path.
function firstNameOf(name: string | null): string {
  const first = name?.trim().split(/\s+/)[0];
  return first || 'there';
}

// Merge tags a step's subject/body can reference — admin-authored via the
// same rich-text editor as the rest of the sequence, so this substitution
// has to run on the raw markdown/plain text before renderEmailBody() (and
// before the subject is used as-is), not on the rendered HTML. {{name}}
// intentionally isn't offered here — a full name reads oddly mid-sentence
// ("Hi Jane Smith,") in a way a first name doesn't; add it later only if
// a real request for it shows up.
function applyMergeTags(text: string, firstName: string): string {
  return text.replace(/\{\{\s*first_name\s*\}\}/gi, firstName);
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const cronSecret = Deno.env.get('NURTURE_CRON_SECRET');
  if (!cronSecret || req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return jsonResponse({ error: 'Not authorized' }, 401);
  }

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const resendApiKey = Deno.env.get('NURTURE_RESEND_API_KEY');
  const senderEmail = Deno.env.get('NURTURE_SENDER_EMAIL');
  if (!resendApiKey || !senderEmail) {
    return jsonResponse({ error: 'Nurture email is not configured for this site' }, 500);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: business } = await supabase
    .from('business')
    .select('display_name, street_address, street_address_2, address_locality, address_region, postal_code, show_crisis_resources')
    .maybeSingle();
  const mailingAddress = business
    ? [business.street_address, business.street_address_2, business.address_locality, business.address_region, business.postal_code]
        .filter(Boolean)
        .join(', ')
    : '';
  const fromHeader = business?.display_name ? `${business.display_name} <${senderEmail}>` : senderEmail;
  // Opt-out, defaults true — see 0032_crisis_resource_line.sql. Counselor
  // Marketing Co.'s own site is the one real client this must be false
  // for: it's the marketing agency itself, not a counseling practice, so
  // its nurture emails go to prospective therapist clients, not
  // individuals seeking mental health care.
  const showCrisisResources = business?.show_crisis_resources !== false;

  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id, name, email, lead_magnet_id, created_at, sequence_next_step')
    .not('lead_magnet_id', 'is', null)
    .is('sequence_unsubscribed_at', null)
    .lte('sequence_next_step', SEQUENCE_SCHEDULE_DAYS.length);

  if (leadsError) {
    return jsonResponse({ error: 'Could not load leads: ' + leadsError.message }, 500);
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const lead of leads ?? []) {
    if (!lead.email) {
      skipped++;
      continue;
    }

    const dayOffset = SEQUENCE_SCHEDULE_DAYS[lead.sequence_next_step - 1];
    const dueAt = new Date(lead.created_at);
    dueAt.setUTCDate(dueAt.getUTCDate() + dayOffset);
    if (new Date() < dueAt) {
      skipped++;
      continue;
    }

    const { data: step } = await supabase
      .from('lead_magnet_sequence_steps')
      .select('subject, body')
      .eq('lead_magnet_id', lead.lead_magnet_id)
      .eq('step_order', lead.sequence_next_step)
      .maybeSingle();

    if (!step) {
      // No content authored for this step yet — skip without advancing,
      // so it sends automatically as soon as the admin adds it, rather
      // than being silently missed forever.
      skipped++;
      continue;
    }

    const firstName = firstNameOf(lead.name);
    const unsubscribeUrl = `${supabaseUrl}/functions/v1/unsubscribe-lead?lead=${lead.id}`;
    const crisisLine = showCrisisResources
      ? '<p style="font-size:12px;color:#888;">If you are in a mental health crisis, call or text 988 to reach the Suicide &amp; Crisis Lifeline, available 24/7.</p>\n'
      : '';
    const html = `${renderEmailBody(applyMergeTags(step.body, firstName))}
<hr style="border:none;border-top:1px solid #ddd;margin:24px 0;">
${crisisLine}<p style="font-size:12px;color:#888;">
  ${mailingAddress ? mailingAddress + '<br>' : ''}
  <a href="${unsubscribeUrl}">Unsubscribe from these emails</a>
</p>`;

    const sendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromHeader,
        to: lead.email,
        subject: applyMergeTags(step.subject, firstName),
        html,
        // One-click unsubscribe via headers (RFC 8058), not just the body
        // link above — Gmail/Yahoo's bulk-sender requirements specifically
        // check for this, and its absence is a real negative signal that
        // pushes a legitimate sequence toward the Promotions tab or spam,
        // separate from the CAN-SPAM-required body link (which stays, for
        // recipients whose client doesn't support the header).
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    });

    if (!sendRes.ok) {
      errors.push(`lead ${lead.id}: ${await sendRes.text()}`);
      continue;
    }

    await supabase
      .from('leads')
      .update({
        sequence_next_step: lead.sequence_next_step + 1,
        sequence_last_sent_at: new Date().toISOString(),
      })
      .eq('id', lead.id);
    sent++;
  }

  return jsonResponse({ sent, skipped, errors });
});
