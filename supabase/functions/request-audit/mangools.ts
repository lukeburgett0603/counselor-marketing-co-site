// Mangools REST calls for the audit: locations (public), keyword volumes,
// Google's first page for a search, and a site's authority. Mangools
// allows only a few requests per short period, so every call goes
// through one paced queue, with a retry when it says slow down.
const BASE = 'https://api.mangools.com/v3';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let last = 0;
async function call(path: string, init: RequestInit = {}): Promise<unknown | null> {
  const key = Deno.env.get('MANGOOLS_API_KEY');
  if (!key) return null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const wait = last + 2000 - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    let res: Response;
    try {
      res = await fetch(BASE + path, {
        ...init,
        headers: { 'x-access-token': key, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(45000),
      });
    } catch (err) {
      console.error('mangools: request failed', path.split('?')[0], String(err));
      return null;
    }
    if (res.status === 429) {
      console.warn('mangools: rate limited, retrying', path.split('?')[0]);
      await sleep(5000 * (attempt + 1));
      continue;
    }
    if (!res.ok) {
      console.error('mangools: non-2xx', path.split('?')[0], res.status, (await res.text()).slice(0, 300));
      return null;
    }
    return await res.json().catch(() => null);
  }
  return null;
}

// "Louisville", "KY" -> the city's location id, else its metro (DMA), else null.
export async function findLocation(city: string, state: string): Promise<number | null> {
  try {
    const res = await fetch(`${BASE}/mangools/locations?query=${encodeURIComponent(city)}`, { signal: AbortSignal.timeout(15000) });
    const list = (await res.json()) as { _id: number; name: string; canonical_name: string; target_type: string; country_code: string }[];
    const us = list.filter((l) => l.country_code?.toLowerCase() === 'us');
    const stateName = Object.entries(STATE_NAMES).find(([, a]) => a === state)?.[0] ?? '';
    const inState = (l: { canonical_name: string }) =>
      new RegExp(`\\b(${state}|${stateName})\\b`, 'i').test(l.canonical_name);
    const cityRe = new RegExp(`^${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return (
      us.find((l) => l.target_type === 'City' && cityRe.test(l.name) && inState(l))?._id ??
      us.find((l) => l.target_type === 'DMA Region' && cityRe.test(l.name) && inState(l))?._id ??
      null
    );
  } catch {
    return null;
  }
}

// Monthly US searches for each phrase (the phrase itself names the city).
export async function volumes(keywords: string[]): Promise<Record<string, number | null>> {
  const out: Record<string, number | null> = Object.fromEntries(keywords.map((k) => [k, null]));
  const data = (await call('/kwfinder/keyword-imports', {
    method: 'POST',
    body: JSON.stringify({ keywords, location_id: 2840, language_id: 0 }),
  })) as { keywords?: { kw: string; sv: number | null }[] } | null;
  for (const k of data?.keywords ?? []) if (k.kw in out) out[k.kw] = typeof k.sv === 'number' ? k.sv : null;
  return out;
}

export interface SerpResult {
  organic: { position: number; domain: string; url: string; title: string; ogTitle: string | null; da: number | null }[];
  mapPack: string[]; // business names in the Maps top 3
}

// Google's first page for a search, as seen from the location.
export async function serp(keyword: string, locationId: number): Promise<SerpResult | null> {
  const data = (await call(`/serpchecker/serps?kw=${encodeURIComponent(keyword)}&location_id=${locationId}&platform_id=1`)) as
    | { items?: Record<string, unknown>[] }
    | null;
  if (!data?.items) return null;
  const organic: SerpResult['organic'] = [];
  let mapPack: string[] = [];
  for (const it of data.items) {
    if (it.type === 'ORGANIC' && typeof it.url === 'string') {
      const m = it.m as { moz?: { v?: { pda?: number } }; fb?: { v?: { og?: { title?: string } | null } } } | undefined;
      organic.push({
        position: Number(it.serpRank) || organic.length + 1,
        domain: String(it.domain ?? new URL(it.url).hostname).replace(/^www\./, ''),
        url: it.url,
        title: String(it.title ?? ''),
        ogTitle: m?.fb?.v?.og?.title ?? null,
        da: typeof m?.moz?.v?.pda === 'number' ? m.moz.v.pda : null,
      });
    } else if (it.type === 'MAP_PACK' && Array.isArray(it.items)) {
      mapPack = (it.items as { title?: string }[]).map((x) => x.title ?? '').filter(Boolean);
    }
  }
  return { organic, mapPack };
}

// Moz Domain Authority for a site, as Mangools reports it.
export async function authority(url: string): Promise<number | null> {
  const data = (await call(`/serpchecker/url-metrics?url=${encodeURIComponent(url)}`)) as { m?: { moz?: { v?: { pda?: number } } } } | null;
  const v = data?.m?.moz?.v?.pda;
  return typeof v === 'number' ? v : null;
}

// Directories and therapist-finder sites: never "the practice at the top".
export const DIRECTORIES: Record<string, string> = {
  'psychologytoday.com': 'Psychology Today',
  'thervo.com': 'Thervo',
  'goodtherapy.org': 'GoodTherapy',
  'zocdoc.com': 'Zocdoc',
  'headway.co': 'Headway',
  'helloalma.com': 'Alma',
  'betterhelp.com': 'BetterHelp',
  'talkspace.com': 'Talkspace',
  'growtherapy.com': 'Grow Therapy',
  'yelp.com': 'Yelp',
  'therapyden.com': 'TherapyDen',
  'openpathcollective.org': 'Open Path Collective',
  'healthgrades.com': 'Healthgrades',
  'mentalhealthmatch.com': 'MentalHealthMatch',
  'therapytribe.com': 'TherapyTribe',
  'theravive.com': 'Theravive',
  'inclusivetherapists.com': 'Inclusive Therapists',
  'networktherapy.com': 'NetworkTherapy',
  'therapistlocator.net': 'TherapistLocator',
  'findapsychologist.org': 'Find a Psychologist',
  'zencare.co': 'Zencare',
  'monarch.health': 'Monarch',
  'rula.com': 'Rula',
  'sondermind.com': 'SonderMind',
  'cerebral.com': 'Cerebral',
  'facebook.com': 'Facebook',
  'linkedin.com': 'LinkedIn',
  'indeed.com': 'Indeed',
  'wikipedia.org': 'Wikipedia',
  'reddit.com': 'Reddit',
  'youtube.com': 'YouTube',
  'yellowpages.com': 'Yellow Pages',
  'bbb.org': 'Better Business Bureau',
  'nextdoor.com': 'Nextdoor',
  'care.com': 'Care.com',
  'webmd.com': 'WebMD',
  'expertise.com': 'Expertise.com',
  'threebestrated.com': 'Three Best Rated',
};

export function directoryName(domain: string): string | null {
  const d = domain.replace(/^www\./, '').toLowerCase();
  for (const [k, v] of Object.entries(DIRECTORIES)) if (d === k || d.endsWith(`.${k}`)) return v;
  return /\.gov$|\.edu$/.test(d) ? d : null;
}

export const STATE_NAMES: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO', connecticut: 'CT', delaware: 'DE',
  florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY',
  louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO',
  montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA',
  washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY', 'district of columbia': 'DC',
};
