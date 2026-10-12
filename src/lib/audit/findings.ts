// Turns an AuditData into the personalized report: findings for each step
// of the Full Caseload System, in Luke's approved wording, filled with the
// practice's own details, and the three fixes most likely to matter first.
//
// Rules for anything added here:
// - Only state what the data shows. No promised results, no invented
//   statistics. The only outside numbers used are Google's own published
//   thresholds (2.5 seconds for a good Largest Contentful Paint).
// - Second person, warm, plain. No em-dashes.
// - Nothing that would be wrong for a counselor to act on under their
//   ethics code (never suggest asking clients for reviews).
import type { AuditData, AuditRanking, SiteChecks } from './types';

export type FindingStatus = 'good' | 'fix' | 'note';
export type StepKey = 'found' | 'chosen' | 'referred' | 'booked';

export interface Finding {
  id: string;
  step: StepKey;
  status: FindingStatus;
  severity: number; // 3 = most urgent; only 'fix' findings are ranked
  title: string;
  body: string;
  action?: string; // the one-line fix, used in the top-3 list
  checklist?: { ok: boolean; text: string }[]; // shown under the body
}

export interface AuditReport {
  greetingName: string | null;
  intro: string;
  glance: { label: string; value: string; note: string; tone: 'good' | 'fix' | 'neutral' }[];
  top: Finding[];
  steps: { key: StepKey; findings: Finding[] }[];
  rankings: AuditRanking[];
  partners: string[];
  compare: Comparison | null;
}

export interface Comparison {
  name: string;
  intro: string;
  rows: { label: string; you: CheckValue; them: CheckValue }[];
  summary: string;
}
export interface CheckValue {
  ok: boolean | null; // null = couldn't check
  text?: string; // shown instead of a mark, e.g. "6.8s"
}

const fmt = (n: number) => n.toLocaleString('en-US');
const q = (s: string) => `“${s}”`;

function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

// "Maya Patel" -> "Maya"; "Dr. Maya Patel" -> "Dr. Patel".
export function greetingName(full: string | null): string | null {
  if (!full) return null;
  const parts = full.trim().split(/\s+/);
  if (/^dr\.?$/i.test(parts[0]) && parts.length > 1) return `Dr. ${parts[parts.length - 1]}`;
  return parts[0] || null;
}

// Mangools returns Google's first page only, so a missing position means
// "not on page one", never a deeper number.
const positionText = (p: number | null) => (p == null ? 'not on Google’s first page' : `#${p}`);

export function buildReport(d: AuditData): AuditReport {
  const name = d.practice.name;
  const city = d.practice.city;
  const inCity = city ? ` in ${city}` : '';
  const findings: Finding[] = [];
  const add = (f: Finding) => findings.push(f);

  // ---------------------------------------------------------------- Get found
  const main = d.rankings[0];
  if (main) {
    const vol = main.volume != null ? `about ${fmt(main.volume)} times a month` : 'regularly';
    const leaders = listJoin(main.leaders.slice(0, 3).map((l) => l.name));
    if (main.position != null && main.position <= 3) {
      add({
        id: 'rank-main', step: 'found', status: 'good', severity: 0,
        title: `You’re in the top 3 for ${q(main.keyword)}.`,
        body: `${q(main.keyword)} is searched ${vol}, and ${name} shows up at #${main.position}. That’s where most people look first, so the job now is protecting that spot and building on it.`,
      });
    } else if (main.position != null && main.position <= 10) {
      add({
        id: 'rank-main', step: 'found', status: 'fix', severity: 2,
        title: `You’re on page one for ${q(main.keyword)}, but not near the top.`,
        body: `${name} is #${main.position} for ${q(main.keyword)}, which is searched ${vol}. ${leaders ? `${leaders} hold the top spots. ` : ''}Most people choose from the first few results, so moving up a handful of places is worth more than it sounds.`,
        action: `Move up for ${q(main.keyword)} with a stronger page for it and a complete Google Business Profile.`,
      });
    } else {
      add({
        id: 'rank-main', step: 'found', status: 'fix', severity: 3,
        title: `People searching ${q(main.keyword)} aren’t finding you yet.`,
        body: `${q(main.keyword)} is searched ${vol}. ${name} is ${positionText(main.position)}.${leaders ? ` Right now, the practices people find are ${leaders}.` : ''}`,
        action: `Build a page that can rank for ${q(main.keyword)}, and make sure your Google Business Profile is complete.`,
      });
    }
  }

  if (main?.directories?.length) {
    const dirs = main.directories;
    add({
      id: 'directories', step: 'found', status: 'note', severity: 0,
      title: 'Directories take some of the top spots.',
      body: `For ${q(main.keyword)}, ${listJoin(dirs)} ${dirs.length === 1 ? 'is' : 'are'} in Google\u2019s top 5. Someone who clicks there sees a list of counselors, so a complete, current profile on ${dirs[0]} is another way for them to find you.`,
    });
  }

  const missing = d.specialties.filter((s) => !s.hasPage);
  const withPage = d.specialties.filter((s) => s.hasPage);
  if (d.specialties.length && missing.length) {
    const best = [...missing].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))[0];
    const demand = best.keyword && best.volume ? ` ${q(best.keyword)} alone is searched about ${fmt(best.volume)} times a month.` : '';
    add({
      id: 'specialty-pages', step: 'found', status: 'fix', severity: best.volume && best.volume >= 30 ? 3 : 2,
      title: missing.length === 1 ? `${best.label} doesn’t have its own page.` : `${missing.length} of your specialties don’t have their own page.`,
      body: `Your site mentions ${listJoin(d.specialties.map((s) => s.label.toLowerCase()))}, but ${withPage.length ? `only ${listJoin(withPage.map((s) => s.label.toLowerCase()))} ${withPage.length === 1 ? 'has' : 'have'} a page of its own` : 'none of them has a page of its own'}.${demand} Google ranks pages, not practices, so a specialty without its own page has very little chance of showing up when someone searches for it.`,
      action: `Give ${best.label.toLowerCase()} its own page${best.keyword ? `, written for people searching ${q(best.keyword)}` : ''}.`,
    });
  } else if (d.specialties.length) {
    add({
      id: 'specialty-pages', step: 'found', status: 'good', severity: 0,
      title: 'Each of your specialties has its own page.',
      body: `That gives Google a clear page to show for each kind of help you offer: ${listJoin(d.specialties.map((s) => s.label.toLowerCase()))}.`,
    });
  }

  if (d.site?.reachable) {
    if (d.site.hasBusinessSchema === false) {
      add({
        id: 'schema', step: 'found', status: 'fix', severity: 2,
        title: 'Google can’t easily tell what kind of business you are.',
        body: `Your site is missing the structured data that tells Google, in its own format, that ${name} is a counseling practice${inCity}: your address, phone, hours, and services. Sites that have it are easier for Google and for AI assistants to understand and show for local searches.`,
        action: 'Add local business structured data to your site.',
      });
    } else if (d.site.hasBusinessSchema) {
      add({
        id: 'schema', step: 'found', status: 'good', severity: 0,
        title: 'Your site tells Google what kind of business you are.',
        body: 'It includes local business structured data, which helps Google and AI assistants understand who you are and where you work.',
      });
    }
    const title = d.site.title ?? '';
    if (!d.site.description) {
      add({
        id: 'meta', step: 'found', status: 'fix', severity: 1,
        title: 'Your homepage has no description for Google to show.',
        body: `Without one, Google picks a sentence from your page to show under your name in search results, and it isn’t always the one you’d choose. A short description in your own words helps the right person click.`,
        action: 'Write a homepage description that says who you help and where.',
      });
    } else if (city && !title.toLowerCase().includes(city.toLowerCase())) {
      add({
        id: 'meta', step: 'found', status: 'fix', severity: 1,
        title: `Your homepage title doesn’t mention ${city}.`,
        body: `In Google, your homepage shows as ${q(title)}. Adding where you are and what you do (for example, counseling in ${city}) helps you show up for local searches and tells people at a glance that you’re nearby.`,
        action: `Rewrite your homepage title to include ${city} and what you do.`,
      });
    }
  }

  if (d.authority?.yours != null && d.authority.leaders.length) {
    const lowest = Math.min(...d.authority.leaders.map((l) => l.value));
    if (d.authority.yours + 10 < lowest) {
      add({
        id: 'authority', step: 'found', status: 'fix', severity: 1,
        title: 'Google trusts the sites above you more, for now.',
        body: `Mangools rates your site’s authority ${d.authority.yours} out of 100. The practices at the top of your main search range from ${lowest} to ${Math.max(...d.authority.leaders.map((l) => l.value))}. Authority grows when other trusted sites link to yours: local organizations, directories, the professionals you work with.`,
        action: 'Earn links from local organizations, directories, and referral partners.',
      });
    }
  }

  const fresh = d.site?.newestContent;
  if (fresh) {
    const ARTICLE_WHY = 'Each helpful article that answers a real question (like \u201chow do I know if I need couples counseling?\u201d) is another page Google can show';
    const when = fresh.date ? new Date(fresh.date) : null;
    const monthYear = when ? when.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';
    const ageMonths = when ? (Date.parse(d.createdAt) - when.getTime()) / (30.44 * 864e5) : null;
    if (!fresh.hasArticles) {
      add({
        id: 'content', step: 'found', status: 'fix', severity: 1,
        title: 'Your site doesn\u2019t have articles yet.',
        body: `${ARTICLE_WHY}. Right now, people can only find you through your main pages.`,
        action: 'Start publishing helpful articles, one every month or two.',
      });
    } else if (ageMonths != null && ageMonths > 12) {
      add({
        id: 'content', step: 'found', status: 'fix', severity: 1,
        title: `Your newest article is from ${monthYear}.`,
        body: `${ARTICLE_WHY} when someone searches for help. Adding one every month or two also tells visitors the practice is active.`,
        action: 'Publish a helpful article every month or two.',
      });
    } else if (ageMonths != null) {
      add({
        id: 'content', step: 'found', status: 'good', severity: 0,
        title: `You\u2019ve published recently (${monthYear}).`,
        body: 'Keeping that pace gives Google more pages to show and tells visitors the practice is active.',
      });
    }
  }

  // --------------------------------------------------------------- Get chosen
  if (d.speed?.loadSeconds != null) {
    const s = d.speed.loadSeconds;
    const secs = s.toFixed(1);
    if (s > 4) {
      add({
        id: 'speed', step: 'chosen', status: 'fix', severity: 3,
        title: `Your site takes ${secs} seconds to load on a phone.`,
        body: `That\u2019s Google\u2019s own test, timing how long a phone takes to show the main part of your homepage. Google considers anything over 2.5 seconds slow. Until then, someone who just worked up the courage to look for help is waiting on a half-built screen.`,
        action: 'Get your phone load time under 2.5 seconds.',
      });
    } else if (s > 2.5) {
      add({
        id: 'speed', step: 'chosen', status: 'fix', severity: 2,
        title: `Your site is a little slow on a phone (${secs} seconds).`,
        body: 'Google considers anything over 2.5 seconds slow. You’re close, and the usual fixes (smaller images, fewer add-ons) are quick.',
        action: 'Get your phone load time under 2.5 seconds.',
      });
    } else {
      add({
        id: 'speed', step: 'chosen', status: 'good', severity: 0,
        title: `Your site loads quickly on a phone (${secs} seconds).`,
        body: 'That’s inside Google’s 2.5-second guideline, so people see your first screen almost right away.',
      });
    }
  }

  if (d.site?.weCount != null && d.site.youCount != null) {
    const { weCount: we, youCount: you } = d.site;
    if (we >= 10 && we > you * 1.5) {
      add({
        id: 'voice', step: 'chosen', status: 'fix', severity: 2,
        title: 'Your homepage talks more about you than about them.',
        body: `Your homepage refers to the practice (we, our, I, my, me) ${we} times and to the reader (you, your) ${you} times. Someone reading it is asking one question: can this person help with what I’m going through? Copy that names their struggle, in their words, usually does more than a list of credentials.`,
        action: 'Rewrite your homepage’s opening around what your clients are going through.',
      });
    } else {
      add({
        id: 'voice', step: 'chosen', status: 'good', severity: 0,
        title: 'Your homepage speaks to the reader.',
        body: `It refers to the reader (you, your) ${you} times and to the practice (we, our, I, my, me) ${we} times. Writing to the person reading, not about the practice, is what helps them feel understood.`,
      });
    }
  }

  if (d.site) {
    const s = d.site;
    const items: { key: string; ok: boolean; yes: string; no: string; fix: string }[] = [];
    if (s.mentionsFees != null) items.push({ key: 'fees', ok: s.mentionsFees, yes: 'Your site mentions fees or insurance.', no: 'Your site doesn\u2019t mention fees or insurance. Someone wondering whether they can afford counseling has to reach out just to find out, and some won\u2019t.', fix: 'fees or insurance' });
    if (s.mentionsNewClients != null) items.push({ key: 'new', ok: s.mentionsNewClients, yes: 'Your site says you\u2019re taking new clients.', no: 'Nothing on your site says whether you\u2019re taking new clients. A simple \u201cNow accepting new clients\u201d answers a question people are often too nervous to ask.', fix: 'whether you\u2019re taking new clients' });
    if (s.mentionsTelehealth != null) items.push({ key: 'online', ok: s.mentionsTelehealth, yes: 'Your site mentions online sessions.', no: 'If you offer online sessions, your site doesn\u2019t say so. Someone looking for therapy from home won\u2019t know it\u2019s an option.', fix: 'whether you offer online sessions' });
    if (s.credentials != null) items.push({ key: 'creds', ok: s.credentials.length > 0, yes: `Your homepage shows your credentials (${s.credentials.join(', ')}).`, no: 'Your homepage doesn\u2019t show a license or credential (like LPC, LCSW, or PhD). Seeing one early tells people they\u2019re in qualified hands.', fix: 'your credentials' });
    if (s.reachable) items.push({ key: 'crisis', ok: !!s.crisisLine, yes: `Your site includes a crisis line (${s.crisisLine ?? ''}).`, no: 'We didn\u2019t find 988 or another crisis line on your site. This isn\u2019t a marketing point. It\u2019s there for the person who finds you at their worst moment and can\u2019t wait for a reply.', fix: 'a crisis line (988)' });
    if (items.length) {
      const gaps = items.filter((i) => !i.ok);
      const checklist = items.map((i) => ({ ok: i.ok, text: i.ok ? i.yes : i.no }));
      const body = 'Before someone reaches out, they\u2019re quietly asking a few questions: Can I afford this? Are you taking anyone new? Can I do this from home? Are you qualified? And if things are bad right now, where do I turn? Here\u2019s what your site answers:';
      if (!gaps.length) {
        add({ id: 'client-first', step: 'chosen', status: 'good', severity: 0, title: 'Your site answers the questions new clients ask first.', body, checklist });
      } else {
        const crisisOnly = gaps.length === 1 && gaps[0].key === 'crisis';
        const fixes = [...gaps].sort((a, b) => Number(b.key === 'crisis') - Number(a.key === 'crisis')).map((g) => g.fix);
        add({
          id: 'client-first', step: 'chosen',
          status: gaps.length >= 2 || crisisOnly ? 'fix' : 'note',
          severity: gaps.length >= 2 ? 2 : crisisOnly ? 1 : 0,
          title: `${gaps.length} of the ${items.length} things new clients look for ${gaps.length === 1 ? 'is' : 'are'} missing.`,
          body, checklist,
          action: `Add ${listJoin(fixes)} to your site.`,
        });
      }
    }
  }

  if (d.accessibility?.score != null) {
    const a = d.accessibility;
    if (a.score! < 90) {
      const names = a.issues.map((id) => A11Y_NAMES[id]).filter(Boolean).slice(0, 3);
      add({
        id: 'a11y', step: 'chosen', status: 'fix', severity: 1,
        title: `Some people may struggle to use your site (accessibility score ${a.score} out of 100).`,
        body: `Google\u2019s test checks whether people with low vision, or who use a screen reader, can use your site.${names.length ? ` The biggest issues it found: ${listJoin(names)}.` : ''} These are usually quick fixes, and they make the site easier for everyone to read on a phone.`,
        action: 'Fix the accessibility issues Google\u2019s test found.',
      });
    } else {
      add({
        id: 'a11y', step: 'chosen', status: 'good', severity: 0,
        title: `Your site is easy to use for people with low vision or screen readers (accessibility score ${a.score} out of 100).`,
        body: 'That\u2019s from Google\u2019s own accessibility test.',
      });
    }
  }

  if (d.site?.bookingPlatform) {
    add({
      id: 'booking', step: 'chosen', status: 'fix', severity: 1,
      title: 'Reaching out takes people off your site.',
      body: `Your booking links go to ${d.site.bookingPlatform}, a separate site with its own look. Every extra step between ${q('this feels right')} and ${q('I reached out')} loses some people. A short form on your own site, answered quickly, keeps them with you.`,
      action: 'Add a short inquiry form on your own site.',
    });
  }

  if (d.site && !d.site.reachable) {
    add({
      id: 'unreachable', step: 'chosen', status: 'fix', severity: 3,
      title: 'We couldn’t load your website.',
      body: `When we tried ${d.practice.url ?? 'your site'}, it didn’t load. If that happens for us, it can happen for someone trying to find you. It’s worth checking right away.`,
      action: 'Check that your website loads for everyone.',
    });
  }
  if (!d.practice.url) {
    add({
      id: 'no-site', step: 'chosen', status: 'fix', severity: 3,
      title: 'You don’t have a website yet.',
      body: `Most people check a counselor’s website before they reach out. Without one, ${name} depends entirely on directories and word of mouth, and the practices above are the ones people find instead.`,
      action: 'Launch a website built around the clients you want to see.',
    });
  }

  // ------------------------------------------------------------- Get referred
  const partners = referralPartners(d);

  // --------------------------------------------------------------- Get booked
  if (d.site?.reachable) {
    const ways = [
      d.site.phoneLink && 'tap-to-call phone',
      d.site.contactForm && 'a contact form',
      d.site.emailLink && 'email',
      d.site.bookingPlatform && `online booking through ${d.site.bookingPlatform}`,
    ].filter(Boolean) as string[];
    if (!d.site.phoneLink) {
      add({
        id: 'phone', step: 'booked', status: 'fix', severity: 2,
        title: 'Your phone number isn’t tap-to-call.',
        body: 'On a phone, a number that isn’t a link has to be copied by hand, and some people won’t. Making it tappable takes a few minutes.',
        action: 'Make your phone number tap-to-call.',
      });
    }
    if (!d.site.contactForm && !d.site.bookingPlatform) {
      add({
        id: 'form', step: 'booked', status: 'fix', severity: 2,
        title: 'There’s no way to reach you from the site itself.',
        body: 'Some people aren’t ready to call. A short form lets them reach out at 11pm, when they finally decide to.',
        action: 'Add a short inquiry form to your site.',
      });
    }
    if (ways.length) {
      add({
        id: 'ways', step: 'booked', status: ways.length >= 2 ? 'good' : 'note', severity: 0,
        title: `People can reach you by ${listJoin(ways)}.`,
        body: 'Offering more than one way matters: some people want to talk right away, and some would rather write first.',
      });
    }
  }
  add({
    id: 'reply', step: 'booked', status: 'note', severity: 0,
    title: 'What happens after someone reaches out matters just as much.',
    body: 'Someone reaching out for counseling may contact more than one practice. The first thoughtful reply has the advantage. We can’t see your inbox from here, but if replies sometimes take a day or more, that’s often the fastest thing to fix.',
  });

  // ---------------------------------------------------------------- Summary
  const order: StepKey[] = ['found', 'chosen', 'referred', 'booked'];
  const top = findings
    .filter((f) => f.status === 'fix')
    .sort((a, b) => b.severity - a.severity || order.indexOf(a.step) - order.indexOf(b.step))
    .slice(0, 3);

  const glance: AuditReport['glance'] = [];
  if (main) {
    glance.push({
      label: 'Your main search',
      value: main.position == null ? 'Not on page 1' : `#${main.position}`,
      note: q(main.keyword),
      tone: main.position != null && main.position <= 3 ? 'good' : main.position != null && main.position <= 10 ? 'neutral' : 'fix',
    });
  }
  if (d.speed?.loadSeconds != null) {
    glance.push({
      label: 'Load time on a phone',
      value: `${d.speed.loadSeconds.toFixed(1)}s`,
      note: 'Google’s guideline: 2.5s',
      tone: d.speed.loadSeconds <= 2.5 ? 'good' : 'fix',
    });
  }
  if (d.specialties.length) {
    glance.push({
      label: 'Specialties with their own page',
      value: `${withPage.length} of ${d.specialties.length}`,
      note: missing.length ? `${missing.length} without one` : 'All covered',
      tone: missing.length ? 'fix' : 'good',
    });
  }

  const compare = buildComparison(d, findings);

  const who = greetingName(d.contactName);
  const intro = `Here’s how ${name} shows up when someone${inCity} looks for a counselor, what happens when they find you, and the three changes most likely to bring you new clients first.`;

  return {
    greetingName: who,
    intro,
    glance,
    top,
    steps: order.map((key) => ({ key, findings: findings.filter((f) => f.step === key) })),
    rankings: d.rankings,
    partners,
    compare,
  };
}

// Referral partner types that fit what the practice offers. A fixed,
// reviewed list; matched on the specialty labels found on their site.
const PARTNER_RULES: { match: RegExp; partners: string[] }[] = [
  { match: /child|teen|adolescent|kid|famil|parent|play/i, partners: ['Pediatricians', 'School counselors and principals'] },
  { match: /couple|marri|relationship|premarital/i, partners: ['Family law attorneys and mediators', 'Clergy who do premarital counseling'] },
  { match: /grief|loss|bereave/i, partners: ['Hospice teams', 'Funeral homes'] },
  { match: /christian|faith|spiritual|church|pastor/i, partners: ['Local churches and pastors'] },
  { match: /trauma|ptsd|emdr|veteran/i, partners: ['Victim advocates', 'Veteran service organizations'] },
  { match: /addict|substance|recovery|alcohol/i, partners: ['Recovery and outpatient treatment centers'] },
  { match: /eating|body image/i, partners: ['Registered dietitians'] },
  { match: /postpartum|perinatal|pregnan|mother/i, partners: ['OB-GYNs and midwives', 'Lactation consultants'] },
  { match: /anxiety|depress|stress|burnout|panic/i, partners: ['Primary care physicians'] },
];

function referralPartners(d: AuditData): string[] {
  const labels = d.specialties.map((s) => s.label).join(' ');
  const out = new Set<string>(['Primary care physicians', 'Other therapists whose caseloads are full']);
  for (const rule of PARTNER_RULES) if (rule.match.test(labels)) rule.partners.forEach((p) => out.add(p));
  return [...out].slice(0, 8);
}

// Lighthouse accessibility audit ids, in plain English.
const A11Y_NAMES: Record<string, string> = {
  'color-contrast': 'text that\u2019s hard to read against its background',
  'image-alt': 'images without descriptions for screen readers',
  label: 'form fields without labels',
  'link-name': 'links without readable names',
  'button-name': 'buttons without readable names',
  'target-size': 'buttons and links too small to tap easily',
  'html-has-lang': 'the page\u2019s language isn\u2019t set',
  'heading-order': 'headings out of order',
};

const weHeavy = (s: SiteChecks) => (s.weCount != null && s.youCount != null ? s.weCount >= 10 && s.weCount > s.youCount * 1.5 : null);

// The same checks on the prospect's site and the top practice's, side by side.
function buildComparison(d: AuditData, findings: Finding[]): Comparison | null {
  const c = d.compare;
  const main = d.rankings[0];
  if (!c?.site || !d.site || !main) return null;
  const mine = d.site;
  const theirs = c.site;
  const speed = (v: number | null): CheckValue => (v == null ? { ok: null } : { ok: v <= 2.5, text: `${v.toFixed(1)}s` });
  const flag = (v: boolean | null): CheckValue => ({ ok: v });
  const voice = (s: SiteChecks): CheckValue => { const h = weHeavy(s); return { ok: h == null ? null : !h }; };
  const rows: Comparison['rows'] = [
    { label: 'Load time on a phone', you: speed(d.speed?.loadSeconds ?? null), them: speed(c.loadSeconds) },
    { label: 'Business information for Google', you: flag(mine.hasBusinessSchema), them: flag(theirs.hasBusinessSchema) },
    { label: 'Phone number is tap-to-call', you: flag(mine.phoneLink), them: flag(theirs.phoneLink) },
    { label: 'Contact form on their own site', you: flag(mine.contactForm), them: flag(theirs.contactForm) },
    { label: 'Mentions fees or insurance', you: flag(mine.mentionsFees), them: flag(theirs.mentionsFees) },
    { label: 'Says whether they\u2019re taking new clients', you: flag(mine.mentionsNewClients), them: flag(theirs.mentionsNewClients) },
    { label: 'Talks to the reader more than about itself', you: voice(mine), them: voice(theirs) },
  ].filter((r) => r.you.ok != null && r.them.ok != null);
  if (!rows.length) return null;
  const yours = rows.filter((r) => r.you.ok).length;
  const theirsPass = rows.filter((r) => r.them.ok).length;

  const intro = c.theyLead
    ? `You\u2019re the first practice people find for ${q(main.keyword)}. Here\u2019s how you compare with ${c.name}, the next one down, so you can see what\u2019s keeping you ahead.`
    : `${c.name} is the first practice people find for ${q(main.keyword)}. Here\u2019s how your site and theirs compare on the same checks.`;

  let summary = c.theyLead
    ? `Of these ${rows.length} checks, your site passes ${yours} and ${c.name}\u2019s passes ${theirsPass}.`
    : `Of these ${rows.length} checks, ${c.name}\u2019s site passes ${theirsPass} and yours passes ${yours}.`;
  if (!c.theyLead) {
    if (theirsPass > yours) {
      summary += ' None of these is hard to fix, and each one is something Google or a new client can see.';
    } else {
      const has = (id: string) => findings.some((f) => f.id === id && f.status === 'fix');
      const where = [has('authority') && 'your site\u2019s authority', has('specialty-pages') && 'pages for each kind of help you offer'].filter(Boolean) as string[];
      summary += ` Your site passes as many of these checks as theirs, or more. The gap is more likely in ${where.length ? listJoin(where) : 'links from other trusted sites'}, which the Get Found section covers.`;
    }
  }
  return { name: c.name, intro, rows, summary };
}
