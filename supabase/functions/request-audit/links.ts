// Backlinks for the audit's "Links that count" section. Mangools LinkMiner
// returns every site linking to a domain, and for small practices almost
// all of them are automated "SEO" junk (39 of New Hope Counseling's top 40
// in October 2026). So nothing here counts links: it keeps only links from
// recognizable kinds of trusted sources (an allowlist), and never shows a
// raw total.
import { DIRECTORIES } from './mangools.ts';

const BASE = 'https://api.mangools.com/v3';

export type LinkCategory = 'chamber' | 'directory' | 'association' | 'community' | 'media' | 'education';

export interface GoodLink {
  name: string;
  domain: string;
  url: string;
  category: LinkCategory;
}

// Therapist directories worth being on (unlike the general DIRECTORIES
// list, which also holds sites like Facebook or Yelp).
const THERAPY_DIRECTORIES: Record<string, string> = {
  'psychologytoday.com': 'Psychology Today',
  'goodtherapy.org': 'GoodTherapy',
  'therapyden.com': 'TherapyDen',
  'openpathcollective.org': 'Open Path Collective',
  'zencare.co': 'Zencare',
  'inclusivetherapists.com': 'Inclusive Therapists',
  'therapytribe.com': 'TherapyTribe',
  'theravive.com': 'Theravive',
  'mentalhealthmatch.com': 'MentalHealthMatch',
  'networktherapy.com': 'NetworkTherapy',
};

const JUNK_TLD = /\.(online|site|space|shop|store|website|monster|cfd|xyz|top|icu|click|buzz|live|fun|life|world|today|tech|pro|biz|info|ru|cn|tk|ml|ga|cf|gq|work|link|club|vip|win|bid|loan|men|date|review|stream|download|racing|party|trade|webcam|science|accountant|cricket|faith)$/i;
const JUNK_WORDS = /wiki|seo|backlink|checker|rank|pbn|dapa|domain|webdir|bookmark|whois|siteprice|worth|similar|statshow|websiteoutlook|linkdirectory|links?list|traffic|analy[sz]|audit|spam|crawl|index(er|ing)|ping|keyword|serp|outlook/i;

function classify(domain: string, title: string): LinkCategory | null {
  const d = domain.toLowerCase();
  const t = title.toLowerCase();
  if (JUNK_TLD.test(d) || JUNK_WORDS.test(d) || JUNK_WORDS.test(t)) return null;
  if (Object.keys(THERAPY_DIRECTORIES).some((k) => d === k || d.endsWith(`.${k}`))) return 'directory';
  if (/chamber|commerce/.test(d + ' ' + t)) return 'chamber';
  if (/\.edu$/.test(d)) return 'education';
  if (/(association|society|board|alliance|council|academy|collaborative)/.test(t) && /(counsel|psycholog|social work|therap|marriage|family|mental)/.test(t)) return 'association';
  if (/counseling\.org|apa\.org|aamft\.org|nbcc\.org|socialworkers\.org|camft\.org/.test(d)) return 'association';
  // Community sources are judged by their own domain, never just the page
  // title: scraper sites title pages "community mental health" too.
  if (/\.gov$/.test(d) || /nami|church|ministr|parish|ymca|unitedway|rotary|kiwanis|library|hospice|mhaof|mentalhealthamerica|\.k12\.|school/.test(d)) return 'community';
  if (/\b(church|library|nami|ymca|hospice|ministry|ministries|parish)\b/.test(t)) return 'community';
  if (/\.org$/.test(d) && /\b(foundation|school)\b/.test(t)) return 'community';
  if (/news|courier|gazette|times|tribune|herald|journal|patch\.com|magazine|radio|npr\.org|wlky|wdrb|wave3|whas/.test(d)) return 'media';
  return null;
}

const KEYWORD_FOR: Record<LinkCategory, RegExp> = {
  chamber: /chamber|commerce/i,
  directory: /./,
  association: /association|society|board|alliance|council|academy/i,
  community: /nami|church|library|ymca|foundation|hospice|school|united way|rotary/i,
  media: /news|times|journal|courier|gazette|herald|tribune/i,
  education: /university|college|school/i,
};

// A readable name: the title segment that names the organization, else
// the domain.
// "eu.courier-journal.com" -> "courier-journal.com", for de-duplicating
// syndicated copies and naming a site when its title is unhelpful.
function rootDomain(domain: string): string {
  const parts = domain.replace(/^www\./, '').toLowerCase().split('.');
  return parts.slice(-2).join('.');
}
const prettyDomain = (domain: string) => {
  const label = rootDomain(domain).split('.')[0];
  // Station call letters: "wdrb" -> "WDRB".
  if (/^[kw][a-z]{2,3}$/.test(label)) return label.toUpperCase();
  return label.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

function linkName(domain: string, title: string, category: LinkCategory): string {
  const d = domain.replace(/^www\./, '').toLowerCase();
  if (category === 'media') return prettyDomain(d);
  const dir = Object.entries(THERAPY_DIRECTORIES).find(([k]) => d === k || d.endsWith(`.${k}`))?.[1] ?? DIRECTORIES[d];
  if (dir) return dir;
  const parts = title.split(/\s[|–—\-:·•]\s/).map((p) => p.trim()).filter((p) => p.length > 2 && p.length < 70);
  const named = parts.find((p) => KEYWORD_FOR[category].test(p));
  return named ?? parts[0] ?? prettyDomain(d);
}

async function fetchLinks(domain: string): Promise<{ source?: string; url?: string; title?: string; deleted?: boolean }[] | null> {
  const key = Deno.env.get('MANGOOLS_API_KEY');
  if (!key) return null;
  try {
    const res = await fetch(`${BASE}/linkminer/links?url=${encodeURIComponent(domain)}&links_per_domain=1`, {
      headers: { 'x-access-token': key },
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) {
      console.error('linkminer: non-2xx', res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const data = await res.json();
    return Array.isArray(data?.links) ? data.links : null;
  } catch (err) {
    console.error('linkminer: failed', String(err));
    return null;
  }
}

function goodLinks(raw: { source?: string; url?: string; title?: string; deleted?: boolean }[]): GoodLink[] {
  const seen = new Set<string>();
  const out: GoodLink[] = [];
  for (const l of raw) {
    const src = l.source ?? l.url;
    if (!src || l.deleted) continue;
    let domain: string;
    try {
      domain = new URL(src).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      continue;
    }
    if (seen.has(rootDomain(domain))) continue;
    const title = String(l.title ?? '');
    const category = classify(domain, title);
    if (!category) continue;
    // One news story republished across a chain's papers counts once.
    const path = new URL(src).pathname;
    if (category === 'media' && path.length > 20) {
      if (seen.has(`story:${path}`)) continue;
      seen.add(`story:${path}`);
    }
    seen.add(rootDomain(domain));
    out.push({ name: linkName(domain, title, category), domain, url: src, category });
  }
  return out;
}

export interface BacklinkData {
  yours: GoodLink[]; // trusted sites already linking to the prospect
  gaps: (GoodLink & { leader: string })[]; // gettable trusted sites linking to a top practice but not to them
  press: { name: string; leader: string }[]; // news coverage of a top practice (evidence for the local-news card)
}

// `wait` paces the calls with the rest of the Mangools requests.
export async function backlinks(
  domain: string | null,
  leaders: { name: string; domain: string }[],
  wait: () => Promise<void>,
): Promise<BacklinkData | null> {
  const mine = domain ? await (async () => { await wait(); return fetchLinks(domain); })() : [];
  if (mine === null) return null;
  // Organizations first, news outlets after.
  const yours = goodLinks(mine).sort((x, y) => Number(x.category === 'media') - Number(y.category === 'media'));
  const have = new Set(yours.map((l) => rootDomain(l.domain)));
  const gaps: BacklinkData['gaps'] = [];
  const press: BacklinkData['press'] = [];
  for (const leader of leaders.slice(0, 2)) {
    await wait();
    const theirs = await fetchLinks(leader.domain);
    for (const l of goodLinks(theirs ?? [])) {
      if (have.has(rootDomain(l.domain))) continue;
      // A news story isn't something a practice can apply for; it becomes
      // evidence on the "ask an expert" card instead.
      if (l.category === 'media') {
        if (!press.some((p) => p.name === l.name)) press.push({ name: l.name, leader: leader.name });
        continue;
      }
      if (gaps.some((g) => rootDomain(g.domain) === rootDomain(l.domain))) continue;
      gaps.push({ ...l, leader: leader.name });
    }
  }
  return { yours, gaps: gaps.slice(0, 8), press: press.slice(0, 3) };
}
