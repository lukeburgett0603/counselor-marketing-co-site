// Sends the instant audit's follow-up emails (CMC only), run hourly by
// pg_cron. One email per step of the Full Caseload System on days 1, 4,
// 7, 10 and 14 after the audit email, each linking to that section of the
// prospect's audit. Wording approved by Luke (audit-v2-wording.md, section
// 8). Day offsets count from the audit email, so a late run never pushes
// the rest of the schedule back. Safe to call any time: nothing is sent
// before it's due, and each step goes out once.
//
// Stops when the prospect unsubscribes (unsubscribe-audit) or their lead
// reaches a closed status. Every email carries a one-click unsubscribe
// (RFC 8058 headers) and CMC's mailing address (AUDIT_MAILING_ADDRESS),
// as CAN-SPAM requires.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildReport } from '../../../src/lib/audit/findings.ts';

const DAYS = [1, 4, 7, 10, 14];
const CLOSED = ['scheduled', 'referred', 'withdrawn'];
const PAGE_URL = Deno.env.get('AUDIT_PAGE_URL') ?? 'https://lukeburgett0603.github.io/counselor-marketing-co-site/audit';
const FN_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1`;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function firstName(full: string | null): string {
  if (!full) return 'there';
  const parts = full.trim().split(/\s+/);
  if (/^dr\.?$/i.test(parts[0]) && parts.length > 1) return `Dr. ${parts[parts.length - 1]}`;
  return parts[0] || 'there';
}

type Email = { subject: string; paragraphs: string[] }; // paragraphs are HTML

function emailFor(step: number, a: Record<string, any>): Email | null {
  const d = a.data;
  const report = buildReport(d);
  const link = (section: string, label: string) => `<a href="${PAGE_URL}?t=${a.token}#${section}">${esc(label)}</a>`;
  const hi = `Hi ${esc(firstName(a.name))},`;
  const sign = 'Luke';
  const main = d.rankings?.[0];
  switch (step) {
    case 0: {
      const top = report.top[0];
      if (!top) return null;
      return {
        subject: 'Your first step from your Caseload Audit',
        paragraphs: [
          hi,
          "Yesterday's audit had a lot in it, so I'll make it simple: if you only do one thing this week, do this:",
          `<strong>${esc(top.action ?? top.title)}</strong>`,
          `The steps are in your audit: ${link(top.step, 'open your audit')}`,
          "Over the next two weeks I'll send one short email for each part of the system, so nothing gets lost. Reply anytime with questions.",
          sign,
        ],
      };
    }
    case 1: {
      if (!main) return null;
      const status =
        main.position == null
          ? "You're not on the first page yet, and the fastest way to change that is a page built for that search."
          : main.position <= 3
            ? `You're already in the top 3, at #${main.position}, so the job now is protecting that spot.`
            : `You're on page one, at #${main.position}, and moving up a few places is worth more than it sounds.`;
      return {
        subject: 'Getting found by people searching near you',
        paragraphs: [
          hi,
          `When someone in ${esc(d.practice.city ?? 'your area')} searches "${esc(main.keyword)}", the practices they find are the ones Google trusts most. ${esc(status)}`,
          `Your Get Found plan, including the links worth getting first: ${link('found', 'open Get Found')}`,
          sign,
        ],
      };
    }
    case 2: {
      const chosen = report.steps.find((s) => s.key === 'chosen')?.findings.find((f) => f.status === 'fix');
      const point = chosen ? chosen.title : 'Your site already does a lot right here, and there are still a few improvements worth making.';
      return {
        subject: 'What happens when they land on your site',
        paragraphs: [
          hi,
          `Someone who finally decides to look for a counselor usually gives a website a few seconds. ${esc(point)}`,
          `Here's what to change, step by step: ${link('chosen', 'open Get Chosen')}`,
          sign,
        ],
      };
    }
    case 3:
      return {
        subject: "The referrals you're not getting yet",
        paragraphs: [
          hi,
          'Many clients come from someone they already trust: a doctor, a pastor, a school counselor. Your audit lists the local professionals worth getting to know first, and includes a letter you can send this week:',
          link('referred', 'open Get Referred'),
          sign,
        ],
      };
    case 4:
      return {
        subject: "How to know it's working",
        paragraphs: [
          hi,
          `The last piece is knowing what's working. Three numbers a week is enough to start: ${link('watch', 'open Watch It Work')}`,
          `If you'd like a hand with any of this, that's what we do. You can see your options here: ${link('options', 'your options')}, or just reply and we'll talk it through.`,
          sign,
        ],
      };
  }
  return null;
}

Deno.serve(async () => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const key = Deno.env.get('NURTURE_RESEND_API_KEY');
  const sender = Deno.env.get('NURTURE_SENDER_EMAIL');
  const address = Deno.env.get('AUDIT_MAILING_ADDRESS');
  if (!key || !sender || !address) return new Response(JSON.stringify({ skipped: 'email not configured' }), { status: 200 });

  const { data: business } = await db.from('business').select('lead_notification_email').maybeSingle();
  const replyTo = String(business?.lead_notification_email ?? '').split(',').map((s) => s.trim()).filter(Boolean)[0];

  const { data: audits } = await db
    .from('audits')
    .select('id, token, name, email, data, lead_id, emailed_at, followup_step')
    .eq('status', 'done')
    .not('emailed_at', 'is', null)
    .is('unsubscribed_at', null)
    .lt('followup_step', DAYS.length);

  let sent = 0;
  for (const a of audits ?? []) {
    const due = Date.parse(a.emailed_at) + DAYS[a.followup_step] * 86_400_000;
    if (Date.now() < due) continue;
    if (a.lead_id) {
      const { data: lead } = await db.from('leads').select('status').eq('id', a.lead_id).maybeSingle();
      if (lead && CLOSED.includes(lead.status)) {
        await db.from('audits').update({ followup_step: DAYS.length }).eq('id', a.id);
        continue;
      }
    }
    let email: Email | null = null;
    try {
      email = emailFor(a.followup_step, a);
    } catch (err) {
      console.error('send-audit-followups: could not build email', a.id, String(err));
    }
    if (email) {
      const unsubscribe = `${FN_URL}/unsubscribe-audit?t=${a.token}`;
      const html = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#18181b;max-width:560px">
${email.paragraphs.map((p) => `<p>${p}</p>`).join('\n')}
<hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0 12px">
<p style="font-size:12px;color:#71717a">You're getting this because you asked for a Caseload Audit. <a href="${unsubscribe}" style="color:#71717a">Unsubscribe</a><br>${esc(address)}</p>
</div>`;
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `Luke Burgett <${sender}>`,
          to: [a.email],
          ...(replyTo ? { reply_to: replyTo } : {}),
          subject: email.subject,
          html,
          headers: { 'List-Unsubscribe': `<${unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
        }),
      });
      if (!res.ok) {
        console.error('send-audit-followups: Resend rejected', a.id, res.status, (await res.text()).slice(0, 300));
        continue; // try again next run
      }
      sent++;
    }
    // Advance even when a step had nothing to say (e.g. no top fix), so the
    // series keeps moving.
    await db.from('audits').update({ followup_step: a.followup_step + 1, followup_last_sent_at: new Date().toISOString() }).eq('id', a.id);
  }
  return new Response(JSON.stringify({ ok: true, sent }), { headers: { 'Content-Type': 'application/json' } });
});
