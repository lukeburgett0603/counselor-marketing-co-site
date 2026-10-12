// Reads a practice's public website and returns the facts the audit uses.
// Everything here is detected from the site's own HTML; anything we can't
// check comes back null ("couldn't check"), never false.
import { DOMParser, type Element, type HTMLDocument } from 'https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36 CMCAudit/1.0';
const MAX_BYTES = 2_000_000;

export interface SiteChecks {
  reachable: boolean;
  title: string | null;
  description: string | null;
  hasBusinessSchema: boolean | null;
  weCount: number | null;
  youCount: number | null;
  phoneLink: boolean | null;
  contactForm: boolean | null;
  emailLink: boolean | null;
  bookingPlatform: string | null;
  mentionsFees: boolean | null;
  mentionsNewClients: boolean | null;
  mentionsTelehealth: boolean | null;
  crisisLine: string | null;
  credentials: string[] | null;
  newestContent: { date: string | null; hasArticles: boolean } | null;
  platform: string | null; // website builder, e.g. "Squarespace"
  directoryProfiles: string[]; // directory profiles their own site links to, e.g. ["psychology-today"]
  counselorCount: number | null; // people with a credential on the team page (or homepage)
}

export interface SiteScan {
  checks: SiteChecks;
  finalUrl: string | null;
  name: string | null; // the practice's own name, from its structured data or title
  city: string | null;
  state: string | null; // two-letter
  specialties: { label: string; kw: string; hasPage: boolean }[];
}

// ---------------------------------------------------------------- fetching

function isPublicHost(host: string): boolean {
  const h = host.toLowerCase();
  if (!h.includes('.') || h === 'localhost' || /\.(local|internal|localhost|lan|home|test)$/.test(h)) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes(':') || h.startsWith('[')) return false; // no raw IPs
  return true;
}

export function normalizeUrl(input: string): string | null {
  let s = input.trim();
  if (!s || /\s/.test(s.replace(/^https?:\/\//, '').split('/')[0])) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!['http:', 'https:'].includes(u.protocol) || !isPublicHost(u.hostname)) return null;
    u.hash = '';
    return u.toString();
  } catch {
    return null;
  }
}

// Follows redirects by hand so every hop is checked against isPublicHost.
export async function fetchText(url: string, timeoutMs = 12000): Promise<{ url: string; status: number; text: string; type: string } | null> {
  let current = url;
  for (let hop = 0; hop < 6; hop++) {
    const u = new URL(current);
    if (!['http:', 'https:'].includes(u.protocol) || !isPublicHost(u.hostname)) return null;
    let res: Response;
    try {
      res = await fetch(current, {
        redirect: 'manual',
        headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      return null;
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = new URL(res.headers.get('location')!, current).toString();
      await res.body?.cancel();
      continue;
    }
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > MAX_BYTES) {
          await reader.cancel();
          break;
        }
        chunks.push(value);
      }
    }
    const buf = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
    let off = 0;
    for (const c of chunks) {
      buf.set(c, off);
      off += c.length;
    }
    return { url: current, status: res.status, text: new TextDecoder().decode(buf), type: res.headers.get('content-type') ?? '' };
  }
  return null;
}

// ---------------------------------------------------------------- detection

const BOOKING: [RegExp, string][] = [
  [/simplepractice\.com|clientsecure\.me/i, 'SimplePractice'],
  [/therapynotes\.com|therapyportal\.com/i, 'TherapyNotes'],
  [/\.janeapp\.com|jane\.app/i, 'Jane'],
  [/theranest\.com/i, 'TheraNest'],
  [/tebra\.com|kareo\.com/i, 'Tebra'],
  [/therapyappointment\.com/i, 'TherapyAppointment'],
  [/valant\.io/i, 'Valant'],
  [/zocdoc\.com/i, 'Zocdoc'],
  [/headway\.co/i, 'Headway'],
  [/helloalma\.com/i, 'Alma'],
  [/calendly\.com/i, 'Calendly'],
  [/acuityscheduling\.com/i, 'Acuity Scheduling'],
];

// Specialties, matched against link text, headings and page addresses only
// (not body text, where "children" or "family" appear in passing).
export const SPECIALTIES: { label: string; re: RegExp; slug: RegExp; kw: string }[] = [
  { label: 'Anxiety', re: /\banxiety\b|\bpanic\b/i, slug: /anxiety|panic/i, kw: 'anxiety therapist' },
  { label: 'Depression', re: /\bdepression\b/i, slug: /depression/i, kw: 'depression therapist' },
  { label: 'Trauma and PTSD', re: /\btrauma\b|\bptsd\b/i, slug: /trauma|ptsd/i, kw: 'trauma therapist' },
  { label: 'EMDR', re: /\bemdr\b/i, slug: /emdr/i, kw: 'emdr therapy' },
  { label: 'Couples counseling', re: /\bcouples?\b|\bmarriage\b|\bmarital\b/i, slug: /couple|marriage|marital/i, kw: 'couples counseling' },
  { label: 'Family therapy', re: /\bfamily (therapy|counseling)\b/i, slug: /family/i, kw: 'family counseling' },
  { label: 'Child and teen therapy', re: /\bchild(ren)?\b|\bteens?\b|\badolescents?\b|\bkids\b|\bplay therapy\b/i, slug: /child|teen|adolescent|kids|play-therapy/i, kw: 'child therapist' },
  { label: 'Grief', re: /\bgrief\b|\bbereavement\b|\bloss\b/i, slug: /grief|bereavement|loss/i, kw: 'grief counseling' },
  { label: 'Addiction', re: /\baddiction\b|\bsubstance (use|abuse)\b/i, slug: /addiction|substance/i, kw: 'addiction counseling' },
  { label: 'Eating disorders', re: /\beating disorders?\b/i, slug: /eating/i, kw: 'eating disorder therapist' },
  { label: 'Postpartum and perinatal', re: /\bpostpartum\b|\bperinatal\b/i, slug: /postpartum|perinatal/i, kw: 'postpartum therapist' },
  { label: 'OCD', re: /\bocd\b|\bobsessive/i, slug: /ocd/i, kw: 'ocd therapist' },
  { label: 'ADHD', re: /\badhd\b/i, slug: /adhd/i, kw: 'adhd therapist' },
  { label: 'Christian counseling', re: /\bchristian\b|\bfaith[- ]based\b/i, slug: /christian|faith/i, kw: 'christian counseling' },
];

const STATES: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO', connecticut: 'CT', delaware: 'DE',
  florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY',
  louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO',
  montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA',
  washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY', 'district of columbia': 'DC',
};
const ABBRS = new Set(Object.values(STATES));

export function stateAbbr(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  if (ABBRS.has(t.toUpperCase()) && t.length === 2) return t.toUpperCase();
  return STATES[t.toLowerCase()] ?? null;
}

const BUSINESS_TYPES = /LocalBusiness|MedicalBusiness|MedicalClinic|MedicalOrganization|ProfessionalService|Psychologist|Physician|HealthAndBeautyBusiness|MentalHealth|Counsel/i;

function jsonLdNodes(doc: HTMLDocument): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const visit = (n: unknown) => {
    if (Array.isArray(n)) return n.forEach(visit);
    if (n && typeof n === 'object') {
      const o = n as Record<string, unknown>;
      out.push(o);
      if (o['@graph']) visit(o['@graph']);
    }
  };
  for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      visit(JSON.parse((s as Element).textContent));
    } catch { /* skip invalid */ }
  }
  return out;
}

const types = (o: Record<string, unknown>) => ([] as unknown[]).concat(o['@type'] ?? []).map(String);

function bodyText(doc: HTMLDocument): string {
  const body = doc.body?.cloneNode(true) as Element | undefined;
  if (!body) return '';
  for (const el of body.querySelectorAll('script, style, noscript, svg, template')) (el as Element).remove();
  return body.textContent.replace(/\s+/g, ' ').trim();
}

// Words in the main copy (header, nav and footer removed) that refer to
// the practice vs. the reader.
function voiceCounts(doc: HTMLDocument): { we: number; you: number } {
  const body = doc.body?.cloneNode(true) as Element | undefined;
  if (!body) return { we: 0, you: 0 };
  for (const el of body.querySelectorAll('script, style, noscript, svg, template, header, nav, footer, form')) (el as Element).remove();
  const t = ` ${body.textContent.replace(/\s+/g, ' ')} `;
  const we = (t.match(/\b(we|our|ours|us|i|my|me)\b/gi) ?? []).filter((w) => w !== 'US').length;
  const you = (t.match(/\b(you|your|yours|you're|yourself)\b/gi) ?? []).length;
  return { we, you };
}

function practiceName(doc: HTMLDocument, nodes: Record<string, unknown>[]): string | null {
  const biz = nodes.find((n) => types(n).some((t) => BUSINESS_TYPES.test(t)) && typeof n.name === 'string');
  if (biz) return String(biz.name).trim();
  const og = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
  if (og?.trim()) return og.trim();
  const org = nodes.find((n) => types(n).includes('Organization') && typeof n.name === 'string');
  if (org) return String(org.name).trim();
  const title = doc.querySelector('title')?.textContent ?? '';
  return nameFromTitle(title);
}

// "Counseling in Louisville | Freedom Counseling Services" -> the segment
// that reads like a business name.
export function nameFromTitle(title: string): string | null {
  const parts = title.split(/\s[|–—\-:·•]\s/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  const biz = /counsel|therap|psych|wellness|health|center|centre|group|services|clinic|practice|associates|llc|pllc/i;
  const generic = /^(home|welcome|homepage)$/i;
  const candidates = parts.filter((p) => !generic.test(p));
  return (candidates.find((p) => biz.test(p) && !/\bin [A-Z]/.test(p)) ?? candidates[candidates.length - 1] ?? parts[0]).replace(/,?\s*(LLC|PLLC|PC|P\.C\.)\.?$/i, '').trim() || null;
}

function findCityState(doc: HTMLDocument, nodes: Record<string, unknown>[], text: string): { city: string | null; state: string | null } {
  for (const n of nodes) {
    const addrs = ([] as unknown[]).concat(n.address ?? [], ...(([] as unknown[]).concat(n.location ?? []) as Record<string, unknown>[]).map((l) => (l as Record<string, unknown>)?.address ?? []));
    for (const a of addrs) {
      if (a && typeof a === 'object') {
        const ad = a as Record<string, unknown>;
        const city = typeof ad.addressLocality === 'string' ? ad.addressLocality.trim() : '';
        const st = stateAbbr(typeof ad.addressRegion === 'string' ? ad.addressRegion : '');
        if (city && st) return { city, state: st };
      }
    }
  }
  // "Louisville, KY 40207" or "Louisville, Kentucky 40207" in the page text.
  const m = text.match(/([A-Z][A-Za-z.' ]{1,28}),\s*(A[LKZR]|C[AOT]|D[EC]|FL|GA|HI|I[ADLN]|K[SY]|LA|M[ADEINOST]|N[CDEHJMVY]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[AT]|W[AIVY]|[A-Z][a-z]+(?: [A-Z][a-z]+)?)\.?\s+\d{5}\b/);
  if (m) {
    const st = stateAbbr(m[2]);
    const city = m[1].trim().split(/\s{2,}|\b(?:Suite|Ste|Street|St\.|Road|Rd|Avenue|Ave|Blvd|Drive|Dr|Floor)\b/i).pop()!.trim();
    if (st && city && city.split(' ').length <= 3) return { city, state: st };
  }
  return { city: null, state: null };
}

const CREDENTIALS = /\b(LPCC-S|LPCC|LPC-S|LPCA|LPC|LCPC|LCSW-S|LCSW|LICSW|LMSW|LMFT|LMHC|LCMHC|LCADC|LADC|NCC|PsyD|Psy\.D\.|Ph\.D\.|PhD|EdD|MFT|ACSW)\b/g;

function sameSite(href: string, base: URL): URL | null {
  try {
    const u = new URL(href, base);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    if (u.hostname.replace(/^www\./, '') !== base.hostname.replace(/^www\./, '')) return null;
    u.hash = '';
    return u;
  } catch {
    return null;
  }
}

function parse(html: string): HTMLDocument | null {
  try {
    return new DOMParser().parseFromString(html, 'text/html');
  } catch {
    return null;
  }
}

const PLATFORMS: [RegExp, string][] = [
  [/static1\.squarespace\.com|squarespace-cdn|<!-- This is Squarespace/i, 'Squarespace'],
  [/wixstatic\.com|static\.parastorage\.com|X-Wix/i, 'Wix'],
  [/\/wp-content\/|\/wp-includes\/|content="WordPress/i, 'WordPress'],
  [/showit\.(co|site)|showitcdn/i, 'Showit'],
  [/webflow\.(com|io)|data-wf-site/i, 'Webflow'],
  [/img1\.wsimg\.com|godaddy/i, 'GoDaddy'],
  [/weebly\.com|editmysite\.com/i, 'Weebly'],
  [/brightervision/i, 'Brighter Vision'],
  [/therapysites\.com/i, 'TherapySites'],
  [/irp-cdn\.multiscreensite\.com|dudamobile/i, 'Duda'],
];

// "Jane Smith, LPC" style names: one per person with a credential.
const NAME_WITH_CREDENTIAL = /\b([A-Z][a-z]+(?:\s+[A-Z]\.)?(?:\s+[A-Z][a-zA-Z'-]+){1,2}),?\s+(?:LPCC-S|LPCC|LPC-S|LPCA|LPC|LCPC|LCSW-S|LCSW|LICSW|LMSW|LMFT|LMHC|LCMHC|LCADC|PsyD|Psy\.D\.|Ph\.D\.|PhD|EdD|MFT|CSW|NCC|MSW)\b/g;
function countPeople(text: string): number {
  // Keyed on the last two words, so "Meet Jane Smith" and "Jane Smith" are one person.
  return new Set([...text.matchAll(NAME_WITH_CREDENTIAL)].map((m) => m[1].toLowerCase().split(/\s+/).slice(-2).join(' '))).size;
}

const FEES = /\b(fees?|rates?|insurance|in[- ]network|out[- ]of[- ]network|sliding[- ]scale|self[- ]pay|private pay|superbill|cost of (therapy|counseling|sessions))\b|\$\s?\d{2,3}\b/i;
const NEW_CLIENTS = /\b(accepting|taking|welcoming)\s+(new\s+)?(clients|patients)\b|\bopenings?\s+(available|for new)\b|\bcurrently accepting\b|\bnow accepting\b/i;
const TELEHEALTH = /\btele[- ]?health\b|\btele[- ]?therapy\b|\bonline (therapy|counseling|sessions)\b|\bvirtual (therapy|counseling|sessions|appointments)\b|\bvideo (sessions|appointments|therapy)\b/i;

// ---------------------------------------------------------------- the scan

export async function scanSite(startUrl: string, opts: { maxPages?: number } = {}): Promise<SiteScan> {
  const empty: SiteScan = {
    checks: {
      reachable: false, title: null, description: null, hasBusinessSchema: null, weCount: null, youCount: null, phoneLink: null,
      contactForm: null, emailLink: null, bookingPlatform: null, mentionsFees: null, mentionsNewClients: null, mentionsTelehealth: null,
      crisisLine: null, credentials: null, newestContent: null, platform: null, counselorCount: null, directoryProfiles: [],
    },
    finalUrl: null, name: null, city: null, state: null, specialties: [],
  };
  const home = await fetchText(startUrl);
  if (!home || home.status >= 400 || !/html/i.test(home.type || 'html')) return empty;
  const doc = parse(home.text);
  if (!doc) return empty;
  const base = new URL(home.url);
  const nodes = jsonLdNodes(doc);
  const homeText = bodyText(doc);

  // Pages the homepage links to, most useful first.
  const linkEls = [...doc.querySelectorAll('a[href]')] as Element[];
  const seen = new Set<string>([base.toString()]);
  const internal: { url: URL; text: string }[] = [];
  for (const a of linkEls) {
    const u = sameSite(a.getAttribute('href') ?? '', base);
    if (!u || /\.(pdf|jpe?g|png|gif|webp|docx?|zip|mp4)$/i.test(u.pathname)) continue;
    const key = u.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    internal.push({ url: u, text: a.textContent.replace(/\s+/g, ' ').trim() });
  }
  const priority = (l: { url: URL; text: string }) =>
    /fee|rate|insurance|cost|pay|faq|question/i.test(l.url.pathname + l.text) ? 0
    : /contact|book|schedule|appointment|start/i.test(l.url.pathname + l.text) ? 1
    : /about|team|staff|counselor|therapist|provider/i.test(l.url.pathname + l.text) ? 2
    : /service|specialt|therapy|counseling/i.test(l.url.pathname + l.text) ? 3 : 4;
  const toFetch = [...internal].sort((a, b) => priority(a) - priority(b)).slice(0, opts.maxPages ?? 10);
  const pages = (await Promise.all(toFetch.map((l) => fetchText(l.url.toString(), 10000))))
    .filter((p): p is NonNullable<typeof p> => !!p && p.status < 400 && /html/i.test(p.type || 'html'))
    .map((p) => ({ url: p.url, doc: parse(p.text) }))
    .filter((p): p is { url: string; doc: HTMLDocument } => !!p.doc);

  const allDocs = [doc, ...pages.map((p) => p.doc)];
  const allText = [homeText, ...pages.map((p) => bodyText(p.doc))].join(' \n ');
  const allLinks = allDocs.flatMap((d) => [...d.querySelectorAll('a[href]')] as Element[]);
  const hrefs = allLinks.map((a) => a.getAttribute('href') ?? '');
  const scripts = allDocs.flatMap((d) => ([...d.querySelectorAll('script[src], iframe[src]')] as Element[]).map((s) => s.getAttribute('src') ?? ''));

  const hasForm = allDocs.some((d) =>
    ([...d.querySelectorAll('form')] as Element[]).some((f) => {
      const role = (f.getAttribute('role') ?? '') + (f.getAttribute('action') ?? '') + (f.className ?? '');
      if (/search/i.test(role)) return false;
      return !!f.querySelector('textarea, input[type="email"], input[name*="email" i]');
    })
  ) || scripts.some((s) => /hsforms|jotform|typeform|formstack|wufoo|cognitoforms|formsite|123formbuilder/i.test(s));

  const booking = BOOKING.find(([re]) => [...hrefs, ...scripts].some((h) => re.test(h)))?.[1] ?? null;
  const { we, you } = voiceCounts(doc);
  const creds = [...new Set((homeText.match(CREDENTIALS) ?? []).map((c) => c.replace(/\./g, '').replace(/^Phd$/i, 'PhD')))].slice(0, 4);
  const crisis = /\b988\b/.test(allText) ? '988' : /crisis text line/i.test(allText) ? 'Crisis Text Line' : /suicide (and|&) crisis lifeline/i.test(allText) ? 'Suicide & Crisis Lifeline' : null;

  // Specialties: mentioned in a link, heading, or page address.
  const labels = [
    ...allLinks.map((a) => a.textContent),
    ...allDocs.flatMap((d) => ([...d.querySelectorAll('h1, h2, h3, nav li')] as Element[]).map((h) => h.textContent)),
  ].join(' \n ');
  const paths = [...internal.map((l) => l.url.pathname), ...pages.map((p) => new URL(p.url).pathname)];
  const specialties = SPECIALTIES.filter((s) => s.re.test(labels) || paths.some((p) => s.slug.test(p)))
    .map((s) => ({ label: s.label, kw: s.kw, hasPage: paths.some((p) => p !== '/' && s.slug.test(p)) }));

  const { city, state } = findCityState(doc, nodes, homeText + ' ' + allText);

  const checks: SiteChecks = {
    reachable: true,
    title: doc.querySelector('title')?.textContent.trim() || null,
    description: doc.querySelector('meta[name="description" i]')?.getAttribute('content')?.trim() || null,
    hasBusinessSchema: nodes.some((n) => types(n).some((t) => BUSINESS_TYPES.test(t))),
    weCount: we,
    youCount: you,
    phoneLink: hrefs.some((h) => /^tel:/i.test(h)),
    contactForm: hasForm,
    emailLink: hrefs.some((h) => /^mailto:/i.test(h)),
    bookingPlatform: booking,
    mentionsFees: FEES.test(allText),
    mentionsNewClients: NEW_CLIENTS.test(allText),
    mentionsTelehealth: TELEHEALTH.test(allText),
    crisisLine: crisis,
    credentials: creds,
    newestContent: await newestContent(base, hrefs),
    platform: null,
    counselorCount: null,
    // A practice almost always links to its own directory profiles, which
    // backlink data often misses (Psychology Today's links aren't indexed).
    directoryProfiles: [
      [/psychologytoday\.com/i, 'psychology-today'],
      [/goodtherapy\.org/i, 'goodtherapy'],
      [/therapyden\.com/i, 'therapyden'],
      [/openpathcollective\.org/i, 'open-path'],
    ].filter(([re]) => hrefs.some((h) => (re as RegExp).test(h))).map(([, k]) => k as string),
  };
  // Counselors: names with a credential on the team page, else the homepage.
  const teamLink = internal.find((l) => /team|staff|counselors|therapists|clinicians|providers|our-people|meet/i.test(l.url.pathname + ' ' + l.text));
  const teamText = teamLink ? pages.find((p) => p.url.replace(/\/$/, '') === teamLink.url.toString().replace(/\/$/, '')) : undefined;
  let people = 0;
  if (teamLink) {
    const doc2 = teamText?.doc ?? (await (async () => { const r = await fetchText(teamLink.url.toString(), 8000); return r && r.status < 400 ? parse(r.text) : null; })());
    if (doc2) people = countPeople(bodyText(doc2));
  }
  if (!people) people = countPeople(homeText);
  checks.counselorCount = people || null;
  checks.platform = PLATFORMS.find(([re]) => re.test(home.text))?.[1] ?? null;

  return { checks, finalUrl: home.url, name: practiceName(doc, nodes), city, state, specialties };
}

// Newest article date from the sitemap. Only article-like addresses count,
// and a sitemap where every page shares one date (regenerated sitewide)
// tells us nothing, so it comes back with date null.
async function newestContent(base: URL, hrefs: string[]): Promise<{ date: string | null; hasArticles: boolean } | null> {
  const ARTICLE = /\/(blog|posts?|articles?|news|resources|insights|journal)\/[^/]+/i;
  const candidates = [new URL('/sitemap.xml', base), new URL('/sitemap_index.xml', base), new URL('/wp-sitemap.xml', base)];
  const robots = await fetchText(new URL('/robots.txt', base).toString(), 6000);
  for (const m of robots?.text.matchAll(/^sitemap:\s*(\S+)/gim) ?? []) {
    try { candidates.unshift(new URL(m[1])); } catch { /* skip */ }
  }
  const entries: { loc: string; lastmod: string | null }[] = [];
  const visited = new Set<string>();
  const queue = candidates.map((u) => u.toString());
  while (queue.length && visited.size < 6) {
    const next = queue.shift()!;
    if (visited.has(next)) continue;
    visited.add(next);
    const res = await fetchText(next, 8000);
    if (!res || res.status >= 400 || !/<(urlset|sitemapindex)/i.test(res.text)) continue;
    if (/<sitemapindex/i.test(res.text)) {
      const subs = [...res.text.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) => m[1]);
      // Post sitemaps first.
      subs.sort((a, b) => Number(/post|blog|article/i.test(b)) - Number(/post|blog|article/i.test(a)));
      queue.unshift(...subs.slice(0, 4));
      continue;
    }
    for (const m of res.text.matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
      const loc = m[1].match(/<loc>\s*([^<]+?)\s*<\/loc>/i)?.[1];
      const lastmod = m[1].match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/i)?.[1] ?? null;
      if (loc) entries.push({ loc, lastmod });
    }
    if (entries.length) break;
  }
  if (!entries.length) {
    // No sitemap: a blog link tells us articles exist, but not how recent.
    return hrefs.some((h) => /\/(blog|articles?|posts?|news)\b/i.test(h)) ? { date: null, hasArticles: true } : null;
  }
  const articles = entries.filter((e) => ARTICLE.test(new URL(e.loc, base).pathname));
  if (!articles.length) return { date: null, hasArticles: hrefs.some((h) => /\/(blog|articles?)\b/i.test(h)) };
  const dates = articles.map((a) => a.lastmod?.slice(0, 10)).filter((d): d is string => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d));
  const distinct = new Set(dates);
  if (!dates.length || (distinct.size === 1 && articles.length > 3)) return { date: null, hasArticles: true };
  return { date: dates.sort().pop()!, hasArticles: true };
}

// Quick look at the homepage only: the practice's name and, if the site
// says, its city and state. Used before the full scan to decide whether
// to ask the prospect for their city.
export async function locate(url: string): Promise<{ finalUrl: string | null; name: string | null; city: string | null; state: string | null; reachable: boolean }> {
  const home = await fetchText(url, 10000);
  const doc = home && home.status < 400 ? parse(home.text) : null;
  if (!home || !doc) return { finalUrl: null, name: null, city: null, state: null, reachable: false };
  const nodes = jsonLdNodes(doc);
  let { city, state } = findCityState(doc, nodes, bodyText(doc));
  if (!city) {
    // Many sites only list the address on the contact page.
    const base = new URL(home.url);
    const contact = ([...doc.querySelectorAll('a[href]')] as Element[])
      .map((a) => ({ u: sameSite(a.getAttribute('href') ?? '', base), t: a.textContent }))
      .find((l) => l.u && /contact|location|office/i.test(l.u.pathname + l.t))?.u;
    if (contact) {
      const page = await fetchText(contact.toString(), 8000);
      const cdoc = page && page.status < 400 ? parse(page.text) : null;
      if (cdoc) ({ city, state } = findCityState(cdoc, jsonLdNodes(cdoc), bodyText(cdoc)));
    }
  }
  return { finalUrl: home.url, name: practiceName(doc, nodes), city, state, reachable: true };
}

// A site's own name, for naming the practices at the top of a search.
export async function siteName(url: string): Promise<string | null> {
  const home = await fetchText(url, 8000);
  const doc = home && home.status < 400 ? parse(home.text) : null;
  return doc ? practiceName(doc, jsonLdNodes(doc)) : null;
}
