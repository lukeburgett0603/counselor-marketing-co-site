// Instant Caseload Audit (CMC only). Called by the audit form right after
// submit-lead saves the lead:
//
//   { lead_id, email, name, practice }   start an audit
//   { audit_id, email, city, state }     the city, when we had to ask
//
// Answers within a few seconds with { token } (or { needs_city }), then
// keeps working in the background: reads the practice's website, runs
// Google's PageSpeed test on it and on the top practice for their main
// search, pulls search data from Mangools, saves the result to `audits`,
// and emails the prospect their link with a copy to Luke. The page
// /audit?t=<token> reads it through get-audit.
//
// Public on purpose (the anon key satisfies verify_jwt, like submit-lead).
// Abuse limits: the lead must exist, match the email and be under two
// hours old; 3 audits per email per day; AUDIT_DAILY_LIMIT (default 30)
// across everyone, which protects the Mangools allowance.
//
// Secrets: MANGOOLS_API_KEY, NURTURE_RESEND_API_KEY, NURTURE_SENDER_EMAIL
// (shared with submit-lead), PAGESPEED_API_KEY (optional),
// AUDIT_DAILY_LIMIT (optional), AUDIT_PAGE_URL (optional).
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { locate, normalizeUrl, scanSite, siteName, nameFromTitle, stateAbbr, type SiteChecks } from './site.ts';
import { authority, directoryName, findLocation, pace, serp, volumes, type SerpResult } from './mangools.ts';
import { backlinks } from './links.ts';
import { pagespeed } from './pagespeed.ts';

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const PAGE_URL = Deno.env.get('AUDIT_PAGE_URL') ?? 'https://lukeburgett0603.github.io/counselor-marketing-co-site/audit';
const DAY = 24 * 60 * 60 * 1000;

function token(): string {
  const b = crypto.getRandomValues(new Uint8Array(18));
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

const admin = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email) return json({ error: 'Email required' }, 400);
  const db = admin();

  // ---- The city, for an audit that asked for it.
  if (typeof body.audit_id === 'string') {
    const city = typeof body.city === 'string' ? body.city.trim().slice(0, 60) : '';
    const state = stateAbbr(typeof body.state === 'string' ? body.state : '');
    if (!city || !state) return json({ error: 'City and state required' }, 400);
    const { data: a } = await db.from('audits').select('id, email, status, token, created_at').eq('id', body.audit_id).maybeSingle();
    if (!a || a.email.toLowerCase() !== email || a.status !== 'needs_city' || Date.now() - Date.parse(a.created_at) > 2 * 60 * 60 * 1000) {
      return json({ error: 'Could not update this audit' }, 400);
    }
    await db.from('audits').update({ city, state, status: 'running' }).eq('id', a.id);
    EdgeRuntime.waitUntil(runAudit(a.id));
    return json({ ok: true, token: a.token });
  }

  // ---- A new audit.
  const leadId = typeof body.lead_id === 'string' ? body.lead_id : '';
  const practice = typeof body.practice === 'string' ? body.practice.trim().slice(0, 300) : '';
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
  if (!leadId || !practice) return json({ error: 'Missing details' }, 400);
  const { data: lead } = await db.from('leads').select('id, email, created_at').eq('id', leadId).maybeSingle();
  if (!lead || String(lead.email).trim().toLowerCase() !== email || Date.now() - Date.parse(lead.created_at) > 2 * 60 * 60 * 1000) {
    return json({ error: 'Could not start an audit' }, 400);
  }
  const { data: existing } = await db.from('audits').select('id, token, status').eq('lead_id', leadId).maybeSingle();
  if (existing) return json(existing.status === 'needs_city' ? { ok: true, needs_city: true, audit_id: existing.id } : { ok: true, token: existing.token });

  const since = new Date(Date.now() - DAY).toISOString();
  const [{ count: mine }, { count: everyone }] = await Promise.all([
    db.from('audits').select('id', { count: 'exact', head: true }).ilike('email', email).gte('created_at', since),
    db.from('audits').select('id', { count: 'exact', head: true }).gte('created_at', since),
  ]);
  const cap = Number(Deno.env.get('AUDIT_DAILY_LIMIT') ?? 30);
  if ((mine ?? 0) >= 3 || (everyone ?? 0) >= cap) return json({ ok: false, reason: 'limit' });

  // Website, or a practice name with its city.
  const url = normalizeUrl(practice);
  let practiceName: string | null = null;
  let city: string | null = null;
  let state: string | null = null;
  let finalUrl: string | null = null;
  if (url) {
    const found = await locate(url);
    finalUrl = found.reachable ? found.finalUrl : url;
    practiceName = found.name;
    city = found.city;
    state = found.state;
  } else {
    const m = practice.match(/^(.*?)[,\s]+([A-Za-z .'-]+?),?\s+([A-Za-z]{2}|[A-Za-z]+(?: [A-Za-z]+)?)$/);
    const st = m ? stateAbbr(m[3]) : null;
    if (m && st) {
      practiceName = m[1].trim() || null;
      city = m[2].trim();
      state = st;
    } else {
      practiceName = practice;
    }
  }

  const row = {
    token: token(),
    lead_id: leadId,
    name: name || null,
    email,
    practice_input: practice,
    practice_name: practiceName,
    url: finalUrl,
    city,
    state,
    status: city && state ? 'running' : 'needs_city',
  };
  const { data: created, error } = await db.from('audits').insert(row).select('id, token').single();
  if (error || !created) return json({ error: 'Could not start an audit' }, 500);
  if (row.status === 'needs_city') return json({ ok: true, needs_city: true, audit_id: created.id });
  EdgeRuntime.waitUntil(runAudit(created.id));
  return json({ ok: true, token: created.token });
});

// ------------------------------------------------------------------ the audit

// "Northstar Counseling Center - Therapy and psychiatric care in Louisville"
// -> "Northstar Counseling Center".
function shortName(name: string): string {
  const first = name.split(/\s[|–—\-:·•]\s|,\s(?=[a-z])/)[0].trim();
  return first.length >= 3 ? first : name;
}

const lower = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const sameDomain = (a: string, b: string) => a.replace(/^www\./, '').toLowerCase() === b.replace(/^www\./, '').toLowerCase();

async function runAudit(id: string) {
  const db = admin();
  const started = Date.now();
  const { data: a } = await db.from('audits').select('*').eq('id', id).single();
  if (!a) return;
  try {
    const city: string = a.city;
    const st: string = a.state;
    const domain = a.url ? new URL(a.url).hostname.replace(/^www\./, '') : null;

    // Start the slow, independent work right away.
    const speedP = a.url ? pagespeed(a.url, true) : Promise.resolve(null);
    const scanP = a.url ? scanSite(a.url) : Promise.resolve(null);
    const locationP = findLocation(city, st);

    const scan = await scanP;
    const practiceName = a.practice_name || scan?.name || (domain ?? a.practice_input);

    // Searches: the two main phrasings, then the practice's specialties.
    const place = lower(`${city} ${st}`);
    const mains = [`counseling ${place}`, `therapist ${place}`];
    const specs = (scan?.specialties ?? []).map((s) => ({ ...s, keyword: `${s.kw} ${place}` }));
    const vols = await volumes([...mains, ...specs.map((s) => s.keyword)]);
    mains.sort((x, y) => (vols[y] ?? 0) - (vols[x] ?? 0));
    const specsByVolume = [...specs].sort((x, y) => (vols[y.keyword] ?? 0) - (vols[x.keyword] ?? 0));

    const locationId = await locationP;
    const serps: Record<string, SerpResult | null> = {};
    if (locationId) {
      for (const kw of [...mains, ...specsByVolume.slice(0, 3).map((s) => s.keyword)]) {
        if (Date.now() - started > 100_000) break; // leave time to finish
        serps[kw] = await serp(kw, locationId);
      }
    }

    const position = (r: SerpResult | null | undefined) => (r && domain ? r.organic.find((o) => sameDomain(o.domain, domain))?.position ?? null : null);
    const main = serps[mains[0]];
    const practices = (main?.organic ?? []).filter((o) => !directoryName(o.domain) && !(domain && sameDomain(o.domain, domain)));
    const leaderRows = practices.slice(0, 3);
    const directories = [...new Set((main?.organic ?? []).filter((o) => o.position <= 5).map((o) => directoryName(o.domain)).filter((n): n is string => !!n && !n.includes('.')))];

    // The practice to compare with: the top one, or the next one down if
    // the prospect is the top practice.
    const yourPos = position(main);
    const rival = leaderRows[0] ?? null;
    const compareP = rival
      ? Promise.all([scanSite(new URL(rival.url).origin, { maxPages: 6 }), pagespeed(new URL(rival.url).origin, false)])
      : Promise.resolve(null);
    const leaderNames = await Promise.all(
      leaderRows.map(async (o) => shortName((await siteName(new URL(o.url).origin)) ?? nameFromTitle(o.ogTitle ?? o.title) ?? o.domain)),
    );

    let yours = main?.organic.find((o) => domain && sameDomain(o.domain, domain))?.da ?? null;
    if (yours == null && a.url) yours = await authority(a.url);
    const links = Date.now() - started < 110_000
      ? await backlinks(domain, leaderRows.map((o, j) => ({ name: leaderNames[j], domain: o.domain })), pace)
      : null;

    const [speed, compared] = await Promise.all([speedP, compareP]);

    const rankings = [...mains, ...specsByVolume.slice(0, 3).map((s) => s.keyword)]
      .filter((kw) => kw in serps && serps[kw])
      .map((kw, i) => ({
        keyword: kw,
        volume: vols[kw] ?? null,
        position: position(serps[kw]),
        leaders: i === 0 ? leaderRows.map((o, j) => ({ name: leaderNames[j], domain: o.domain, position: o.position })) : [],
        ...(i === 0 && directories.length ? { directories } : {}),
      }));

    const data = {
      id: a.id,
      createdAt: a.created_at,
      contactName: a.name,
      practice: { name: practiceName, url: a.url, city, state: st },
      rankings,
      authority: leaderRows.length ? { yours, leaders: leaderRows.filter((o) => o.da != null).map((o) => ({ domain: o.domain, value: o.da! })) } : null,
      specialties: specs.map((s) => ({ label: s.label, hasPage: s.hasPage, keyword: s.keyword, volume: vols[s.keyword] ?? null })),
      site: scan ? scan.checks : a.url ? { ...emptyChecks(), reachable: false } : null,
      speed: speed ? { score: speed.score, loadSeconds: speed.loadSeconds, screenshot: speed.screenshot } : null,
      accessibility: speed?.accessibility ?? null,
      backlinks: links,
      compare:
        rival && compared && compared[0].checks.reachable
          ? {
              name: leaderNames[0],
              domain: rival.domain,
              position: rival.position,
              theyLead: yourPos != null && yourPos < rival.position,
              site: compared[0].checks,
              loadSeconds: compared[1]?.loadSeconds ?? null,
            }
          : null,
      // For Luke's email only; not shown on the prospect's page.
      mapPack: main?.mapPack ?? [],
    };

    await db.from('audits').update({ status: 'done', data, practice_name: practiceName, completed_at: new Date().toISOString() }).eq('id', id);
    await sendEmails(db, { ...a, practice_name: practiceName }, data);
  } catch (err) {
    console.error('request-audit: run failed', String(err));
    await db.from('audits').update({ status: 'failed', error: String(err).slice(0, 500) }).eq('id', id);
    await notifyFailure(db, a, String(err));
  }
}

function emptyChecks(): SiteChecks {
  return {
    reachable: false, title: null, description: null, hasBusinessSchema: null, weCount: null, youCount: null, phoneLink: null,
    contactForm: null, emailLink: null, bookingPlatform: null, mentionsFees: null, mentionsNewClients: null, mentionsTelehealth: null,
    crisisLine: null, credentials: null, newestContent: null, platform: null, counselorCount: null, directoryProfiles: [],
  };
}

// ------------------------------------------------------------------ email

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function firstName(full: string | null): string {
  if (!full) return 'there';
  const parts = full.trim().split(/\s+/);
  if (/^dr\.?$/i.test(parts[0]) && parts.length > 1) return `Dr. ${parts[parts.length - 1]}`;
  return parts[0] || 'there';
}

async function resend(payload: Record<string, unknown>): Promise<boolean> {
  const key = Deno.env.get('NURTURE_RESEND_API_KEY');
  if (!key) return false;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) console.error('request-audit: Resend rejected', res.status, (await res.text()).slice(0, 300));
  return res.ok;
}

async function lukeAddresses(db: SupabaseClient): Promise<string[]> {
  const { data } = await db.from('business').select('lead_notification_email').maybeSingle();
  return String(data?.lead_notification_email ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}

async function sendEmails(db: SupabaseClient, a: Record<string, any>, data: Record<string, any>) {
  const sender = Deno.env.get('NURTURE_SENDER_EMAIL');
  if (!sender) return;
  const link = `${PAGE_URL}?t=${a.token}`;
  const luke = await lukeAddresses(db);
  const practice = esc(String(a.practice_name));

  const sent = await resend({
    from: `Luke Burgett <${sender}>`,
    to: [a.email],
    ...(luke[0] ? { reply_to: luke[0] } : {}),
    subject: `Your Caseload Audit for ${a.practice_name}`,
    html: `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#18181b;max-width:560px">
<p>Hi ${esc(firstName(a.name))},</p>
<p>Your Caseload Audit for ${practice} is ready:</p>
<p><a href="${link}" style="display:inline-block;background:#2447d6;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">Open your audit</a></p>
<p>It covers how people find you on Google, what happens when they land on your site, and the three changes most likely to bring you new clients first.</p>
<p>If you'd like to talk it through, just reply to this email.</p>
<p>Luke Burgett, LPCA<br>Counselor Marketing Co.</p>
</div>`,
  });
  if (sent) await db.from('audits').update({ emailed_at: new Date().toISOString() }).eq('id', a.id);

  if (!luke.length) return;
  const main = data.rankings?.[0];
  const rows: [string, string | null][] = [
    ['Name', a.name],
    ['Email', a.email],
    ['Practice', a.practice_name],
    ['Website', a.url ?? '(none)'],
    ['Location', `${a.city}, ${a.state}`],
    ['Main search', main ? `"${main.keyword}": ${main.position ? `#${main.position}` : 'not on page one'}${main.volume ? ` (${main.volume}/mo)` : ''}` : null],
    ['Practice at the top', data.compare ? `${data.compare.name} (${data.compare.domain})` : null],
    ['Maps top 3 (main search)', data.mapPack?.length ? data.mapPack.join(', ') : null],
    ['Phone load time', data.speed?.loadSeconds != null ? `${data.speed.loadSeconds}s` : null],
    ['Specialties found', data.specialties?.length ? data.specialties.map((s: any) => `${s.label}${s.hasPage ? '' : ' (no page)'}`).join(', ') : null],
    ['Prospect email sent', sent ? 'yes' : 'NO, send the link yourself'],
  ];
  await resend({
    from: `Caseload Audit <${sender}>`,
    to: luke,
    reply_to: a.email,
    subject: `Audit sent: ${a.practice_name} (${a.name ?? a.email})`,
    html: `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#18181b">
<p><a href="${link}">Open ${practice}'s audit</a></p>
${rows.filter(([, v]) => v).map(([k, v]) => `<p style="margin:0 0 6px"><strong>${esc(k)}:</strong> ${esc(String(v))}</p>`).join('\n')}
<p style="font-size:12px;color:#71717a;margin-top:16px">Reply to this email to write to ${esc(a.name ?? a.email)} directly.</p>
</div>`,
  });
}

async function notifyFailure(db: SupabaseClient, a: Record<string, any>, error: string) {
  const sender = Deno.env.get('NURTURE_SENDER_EMAIL');
  const luke = await lukeAddresses(db);
  if (!sender || !luke.length) return;
  await resend({
    from: `Caseload Audit <${sender}>`,
    to: luke,
    reply_to: a.email,
    subject: `Audit FAILED: ${a.practice_name ?? a.practice_input} (${a.name ?? a.email})`,
    html: `<p>The instant audit couldn't finish, so the prospect hasn't received one. Send it by hand.</p>
<p><strong>Name:</strong> ${esc(a.name ?? '')}<br><strong>Email:</strong> ${esc(a.email)}<br><strong>Practice:</strong> ${esc(a.practice_input)}</p>
<p><strong>Error:</strong> ${esc(error)}</p>`,
  });
}
