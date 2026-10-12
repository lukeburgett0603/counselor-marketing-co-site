// Full data export for admin/your-data.astro: every table the practice
// owns, as CSV + JSON, plus its uploaded files, zipped with a README. Kept
// separate from the page so the table list and CSV rules live in one place.

import { strToU8, zipSync, type Zippable } from 'fflate';
import type { SupabaseClient } from '@supabase/supabase-js';

// Everything that is the practice's own data. admin_users is deliberately
// excluded: logins belong to each person, and passwords are never readable.
export const EXPORT_TABLES: { table: string; label: string }[] = [
  { table: 'leads', label: 'Leads and guide downloads' },
  { table: 'lead_notes', label: 'Lead notes' },
  { table: 'referral_partners', label: 'Referral partners' },
  { table: 'referral_partner_activities', label: 'Referral partner activity' },
  { table: 'link_opportunities', label: 'Link building tracker' },
  { table: 'counselor_caseload', label: 'Caseload settings' },
  { table: 'review_snapshots', label: 'Google review log' },
  { table: 'business', label: 'Business info and settings' },
  { table: 'pages', label: 'Website pages and blog posts' },
  { table: 'lead_magnets', label: 'Guides (lead magnets)' },
  { table: 'lead_magnet_sequence_steps', label: 'Guide follow-up emails' },
  { table: 'content_plan_items', label: 'Content plan' },
  { table: 'content_suggestions', label: 'Content suggestions' },
  { table: 'target_keywords', label: 'Target searches' },
  { table: 'keyword_rank_snapshots', label: 'Search ranking history' },
  { table: 'keyword_gap_snapshots', label: 'Competitor keyword gaps' },
  { table: 'page_cta_clicks', label: 'Button click history' },
];

// Larger files (videos) are listed with a link instead of packed into the
// zip, so building the download in the browser stays reliable.
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const PAGE_SIZE = 1000;

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  return [columns.join(','), ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(','))].join('\r\n');
}

async function fetchAll(supabase: SupabaseClient, table: string): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as Record<string, unknown>[]));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

export async function buildDataExport(
  supabase: SupabaseClient,
  onProgress: (message: string) => void
): Promise<{ zip: Uint8Array; summary: string }> {
  const files: Zippable = {};
  const counts: string[] = [];
  const problems: string[] = [];
  let allJson = '';

  for (const [i, { table, label }] of EXPORT_TABLES.entries()) {
    onProgress(`Exporting ${label.toLowerCase()} (${i + 1} of ${EXPORT_TABLES.length})...`);
    try {
      const rows = await fetchAll(supabase, table);
      const json = JSON.stringify(rows, null, 2);
      allJson += json;
      files[`data/${table}.json`] = strToU8(json);
      files[`data/${table}.csv`] = strToU8(toCsv(rows));
      counts.push(`- ${label}: ${rows.length} row${rows.length === 1 ? '' : 's'} (data/${table}.csv)`);
    } catch (err) {
      problems.push(`- ${label} (${table}): could not export (${err instanceof Error ? err.message : String(err)})`);
    }
  }

  // Uploaded files: every Storage URL referenced anywhere in the data.
  const storageUrls = [...new Set(allJson.match(/https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/[^"\s\\)]+/g) ?? [])];
  const linkedOnly: string[] = [];
  let downloaded = 0;
  for (const [i, url] of storageUrls.entries()) {
    onProgress(`Downloading your files (${i + 1} of ${storageUrls.length})...`);
    const path = decodeURIComponent(url.split('/storage/v1/object/public/')[1]);
    try {
      const head = await fetch(url, { method: 'HEAD' });
      const size = Number(head.headers.get('content-length') ?? 0);
      if (!head.ok) throw new Error(`HTTP ${head.status}`);
      if (size > MAX_FILE_BYTES) {
        linkedOnly.push(`- ${path} (${Math.round(size / 1024 / 1024)} MB): ${url}`);
        continue;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      files[`files/${path}`] = new Uint8Array(await res.arrayBuffer());
      downloaded++;
    } catch (err) {
      problems.push(`- File ${path}: could not download (${err instanceof Error ? err.message : String(err)})`);
    }
  }

  const readme = `Your data export
Created: ${new Date().toLocaleString()}

This is everything your practice has in the system, in standard formats:
each table as a CSV file (opens in Excel, Numbers, or Google Sheets) and as
JSON (for importing into another system), plus your uploaded files.

TABLES
${counts.join('\n')}

FILES
- ${downloaded} uploaded file(s) in the files/ folder.
${linkedOnly.length ? `\nLARGE FILES (download these separately while the links still work)\n${linkedOnly.join('\n')}\n` : ''}${
    problems.length ? `\nNOT INCLUDED (tell your Counselor Marketing Co. contact)\n${problems.join('\n')}\n` : ''
  }
PRIVACY
This export contains names and contact details of people who reached out to
your practice. Store it securely and don't send it by unencrypted email.
`;
  files['README.txt'] = strToU8(readme);

  onProgress('Zipping...');
  const zip = zipSync(files, { level: 6 });
  const tableCount = counts.length;
  const summary =
    `Downloaded ${tableCount} table${tableCount === 1 ? '' : 's'} and ${downloaded} file${downloaded === 1 ? '' : 's'}.` +
    (problems.length ? ` ${problems.length} item(s) couldn't be included; see README.txt.` : '') +
    (linkedOnly.length ? ` ${linkedOnly.length} large file(s) are linked in README.txt.` : '');
  return { zip, summary };
}
