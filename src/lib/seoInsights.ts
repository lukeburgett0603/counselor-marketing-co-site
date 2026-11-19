// Pure derivation helpers for the SEO Insights admin page
// (admin/analytics/seo.astro) — kept out of that page's inline <script>
// for the same "one query + pure derivation functions over an
// already-fetched array" reason getCounselorOptions/getAuthorHeadshot
// are split out of pages.ts rather than inlined at each call site.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface TargetKeyword {
  id: string;
  keyword: string;
  search_volume: number | null;
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'paused' | 'achieved';
  notes: string | null;
  // The tracked-keyword id *within* this client's one shared SerpWatcher
  // tracking (business.mangools_tracking_id) — not a tracking id itself.
  // See 0060_seo_insights_mangools_ids.sql for why this was renamed from
  // mangools_tracking_id after real Mangools API-docs research showed a
  // tracking covers a client's whole domain, not one keyword.
  mangools_tracked_keyword_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RankSnapshot {
  id: string;
  target_keyword_id: string;
  checked_at: string;
  position: number | null;
  ranking_url: string | null;
}

export interface GapSnapshot {
  id: string;
  keyword: string;
  search_volume: number | null;
  competitor_domain: string;
  checked_at: string;
}

// Normalizes a keyword/focus_keyword for equality comparison — same
// trim().toLowerCase() discipline as the lead-magnet-to-lead conversion
// stat in admin/leads.astro, reused here instead of duplicated.
export function normalizeKeyword(value: string): string {
  return value.trim().toLowerCase();
}

// The two most recent snapshots per target_keyword_id, newest first —
// used to show "current position" and compute a trend without a second
// query. A keyword with fewer than 2 snapshots yields a shorter array
// rather than padding with invented data; callers must handle that case
// (see renderTrend below) instead of assuming a pair always exists.
export function latestSnapshotsByKeyword(
  snapshots: RankSnapshot[]
): Map<string, RankSnapshot[]> {
  const byKeyword = new Map<string, RankSnapshot[]>();
  for (const snap of snapshots) {
    const list = byKeyword.get(snap.target_keyword_id) ?? [];
    list.push(snap);
    byKeyword.set(snap.target_keyword_id, list);
  }
  for (const list of byKeyword.values()) {
    list.sort((a, b) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime());
    list.length = Math.min(list.length, 2);
  }
  return byKeyword;
}

export type Trend = 'up' | 'down' | 'same' | 'new';

// Never fabricates a trend from a single snapshot — 'new' is the honest
// answer when there's nothing yet to compare against, distinct from
// 'same' (two real snapshots that happen to match).
export function computeTrend(latestTwo: RankSnapshot[]): Trend {
  if (latestTwo.length < 2) return 'new';
  const [current, previous] = latestTwo;
  if (current.position == null || previous.position == null) return 'new';
  // Lower position number = better ranking, so a decrease is "up".
  if (current.position < previous.position) return 'up';
  if (current.position > previous.position) return 'down';
  return 'same';
}

// Target keywords with no page currently targeting them — the free
// fourth widget, computed entirely from data already on file (no
// external API call). Matches target_keywords.keyword against every
// page's focus_keyword, normalized on both sides.
export function keywordsWithNoPage(
  targetKeywords: TargetKeyword[],
  pageFocusKeywords: (string | null)[]
): TargetKeyword[] {
  const covered = new Set(
    pageFocusKeywords.filter((k): k is string => !!k).map(normalizeKeyword)
  );
  return targetKeywords.filter((tk) => !covered.has(normalizeKeyword(tk.keyword)));
}

// The most recent competitor-gap batch only — gap data is a point-in-time
// comparison, not a per-keyword history the way rank snapshots are, so
// the dashboard only ever shows the latest run's results.
export function latestGapBatch(snapshots: GapSnapshot[]): GapSnapshot[] {
  if (snapshots.length === 0) return [];
  const latestCheckedAt = Math.max(...snapshots.map((s) => new Date(s.checked_at).getTime()));
  // Same run's rows share the same batch timestamp in practice (all
  // inserted in one refresh-seo-rankings invocation), but compare by
  // date only (not exact ms) to tolerate any tiny per-row insert drift.
  const latestDate = new Date(latestCheckedAt).toDateString();
  return snapshots.filter((s) => new Date(s.checked_at).toDateString() === latestDate);
}

// ---------------------------------------------------------------------------
// History windows (2026-11-18). Ranking and competitor-gap history grow every
// week (Freedom: about 77 ranking rows and 96 gap rows a week) and a Supabase
// request returns at most 1,000 rows. Fetching the whole history on every
// visit would quietly cut rows off (ranking history crosses 1,000 within a
// few months) and download more each week for nothing. Screens fetch only the
// window they show, counted back from the newest check (not from today), so
// a paused weekly refresh still shows the last results.

const DAY_MS = 86_400_000;
const PAGE = 1000;

async function windowStart(supabase: SupabaseClient, table: string, days: number): Promise<string | null> {
  const { data } = await supabase.from(table).select('checked_at').order('checked_at', { ascending: false }).limit(1);
  const newest = (data?.[0] as { checked_at?: string } | undefined)?.checked_at;
  return newest ? new Date(new Date(newest).getTime() - days * DAY_MS).toISOString() : null;
}

async function rowsSince<T>(supabase: SupabaseClient, table: string, columns: string, since: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .gte('checked_at', since)
      .order('checked_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) return rows;
  }
}

/** Ranking rows (newest first) from the newest check back `days` days. */
export async function fetchRankHistory<T = RankSnapshot>(supabase: SupabaseClient, days: number, columns = '*'): Promise<T[]> {
  const since = await windowStart(supabase, 'keyword_rank_snapshots', days);
  return since ? rowsSince<T>(supabase, 'keyword_rank_snapshots', columns, since) : [];
}

/** Competitor-gap rows from the latest weekly run only (what the page shows). */
export async function fetchLatestGapRows(supabase: SupabaseClient): Promise<GapSnapshot[]> {
  const since = await windowStart(supabase, 'keyword_gap_snapshots', 1);
  return since ? latestGapBatch(await rowsSince<GapSnapshot>(supabase, 'keyword_gap_snapshots', '*', since)) : [];
}
