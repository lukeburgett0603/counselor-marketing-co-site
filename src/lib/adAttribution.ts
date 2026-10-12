// Google Ads attribution: which ad click (if any) a lead came from. The
// "Get Found" step's paid-search half. See 0072_ad_attribution.sql.
//
// Privacy design: the site sends nothing to Google. AdAttributionCapture
// (in BaseLayout) stores the click ID and UTM tags from the landing URL in
// the visitor's own browser (first-party localStorage, 90 days, Google's
// offline-import window); LeadGenerator attaches them to a submitted lead,
// and they land only in the practice's own database. Reporting conversions
// back to Google is a separate, manual CSV upload the practice chooses to
// do (admin/crm.astro).

export const ATTRIBUTION_STORAGE_KEY = 'lead-attribution';
export const ATTRIBUTION_MAX_AGE_DAYS = 90;

export const ATTRIBUTION_PARAMS = [
  'gclid',
  'gbraid',
  'wbraid',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const;

export type AttributionParam = (typeof ATTRIBUTION_PARAMS)[number];

export type StoredAttribution = Partial<Record<AttributionParam, string>> & {
  landing_page: string;
  captured_at: string;
};

export type AttributedLead = {
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
};

// A lead counts as "from Google Ads" when it carries a Google click ID, or
// is explicitly UTM-tagged as paid Google traffic (for campaigns run with
// auto-tagging off).
export function isGoogleAdsLead(lead: AttributedLead): boolean {
  if (lead.gclid || lead.gbraid || lead.wbraid) return true;
  const source = (lead.utm_source ?? '').toLowerCase();
  const medium = (lead.utm_medium ?? '').toLowerCase();
  return source.includes('google') && ['cpc', 'ppc', 'paid', 'paidsearch', 'paid_search', 'sem'].includes(medium);
}

// Reads the stored attribution, dropping it once it's older than Google's
// 90-day window. Storage can be unavailable (private browsing), so every
// access is guarded and failure just means "no attribution".
export function readStoredAttribution(): StoredAttribution | null {
  try {
    const raw = localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAttribution;
    const ageDays = (Date.now() - new Date(parsed.captured_at).getTime()) / 86_400_000;
    if (!(ageDays >= 0 && ageDays <= ATTRIBUTION_MAX_AGE_DAYS)) {
      localStorage.removeItem(ATTRIBUTION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

// Last-click: a new tagged visit replaces the old one, matching how Google
// Ads itself attributes. Untagged visits never overwrite.
export function captureAttributionFromUrl(url: URL): void {
  const found: Partial<Record<AttributionParam, string>> = {};
  for (const param of ATTRIBUTION_PARAMS) {
    const value = url.searchParams.get(param)?.trim();
    if (value) found[param] = value.slice(0, 300);
  }
  if (Object.keys(found).length === 0) return;
  const record: StoredAttribution = { ...found, landing_page: url.pathname.slice(0, 300), captured_at: new Date().toISOString() };
  try {
    localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* storage unavailable: attribution just isn't captured */
  }
}

// ---------------------------------------------------------------------------
// Google Ads offline conversion upload (CSV), built in the Lead CRM.
// Format per Google's "Import conversions from ad clicks" file template:
// a Parameters:TimeZone row, then Google Click ID / Conversion Name /
// Conversion Time. No names, emails, or any other personal data: only the
// click ID Google itself issued, the conversion name, and a time.
// ---------------------------------------------------------------------------

export type ConversionKind = 'request' | 'booked';

export type UploadLead = AttributedLead & {
  gclid: string | null;
  status: string | null;
  created_at: string;
  scheduled_at: string | null;
  lead_magnet_id?: string | null;
};

// Google only accepts conversions within 90 days of the click. The click
// itself always happened before the lead was created, so a lead older than
// that is dropped rather than uploaded to fail.
const UPLOAD_WINDOW_DAYS = 90;

function formatInZone(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

export function buildGoogleAdsUpload(
  leads: UploadLead[],
  kind: ConversionKind,
  conversionName: string,
  timeZone: string,
  now = Date.now()
): { csv: string; count: number; skippedNoGclid: number } {
  const cutoff = now - UPLOAD_WINDOW_DAYS * 86_400_000;
  const eligible = leads.filter((l) => {
    if (l.lead_magnet_id || !isGoogleAdsLead(l)) return false;
    if (new Date(l.created_at).getTime() < cutoff) return false;
    return kind === 'request' ? true : l.status === 'scheduled' && Boolean(l.scheduled_at);
  });
  const withClick = eligible.filter((l) => l.gclid);
  const rows = withClick.map((l) => {
    const when = kind === 'request' ? l.created_at : l.scheduled_at!;
    return [l.gclid!, conversionName, formatInZone(when, timeZone)];
  });
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = [
    `Parameters:TimeZone=${timeZone}`,
    ['Google Click ID', 'Conversion Name', 'Conversion Time'].join(','),
    ...rows.map((r) => r.map(escape).join(',')),
  ].join('\n');
  return { csv, count: rows.length, skippedNoGclid: eligible.length - withClick.length };
}
